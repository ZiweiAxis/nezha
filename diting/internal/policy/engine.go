// Package policy provides policy matching engine for Diting.
package policy

import (
	"context"
	"fmt"
	"log"
	"path"
	"regexp"
	"strings"
	"sync"
	"time"

	"diting/internal/xiezhi"
)

// Decision represents the policy decision
type Decision string

const (
	DecisionAllow Decision = "allow"
	DecisionBlock Decision = "block"
	DecisionAsk   Decision = "ask"
)

// MatchResult represents the result of policy matching
type MatchResult struct {
	Decision  Decision
	PolicyID  string
	Reason    string
	Metadata  map[string]string
	Timestamp time.Time
}

// Request represents a policy evaluation request
type Request struct {
	Subject   string            // agent/sandbox ID
	Operation string            // e.g., "exec:run", "exec:fs.write"
	Resource  string            // e.g., "/bin/bash", "docker://container-1"
	Context   map[string]string // additional context
	PID       int
	CWD       string
	Args      []string
	Env       map[string]string
}

// Engine is the policy matching engine
type Engine struct {
	mu           sync.RWMutex
	policies     map[string]*Policy // policy ID -> policy
	store        PolicyStore
	cache        *PolicyCache
	xiezhiClient *xiezhi.Client
	config       EngineConfig
}

// EngineConfig holds engine configuration
type EngineConfig struct {
	EnableCache      bool
	CacheTTL         time.Duration
	CacheMaxSize     int
	XiezhiEnabled    bool
	XiezhiURL        string
	XiezhiTimeout    time.Duration
	EnableLocalMatch bool
}

// PolicyStore defines the interface for policy storage
type PolicyStore interface {
	Get(id string) (*Policy, bool)
	List() ([]*Policy, error)
	Add(policy *Policy) error
	Update(policy *Policy) error
	Delete(id string) error
	Clear() error
}

// NewEngine creates a new policy engine
func NewEngine(store PolicyStore, config EngineConfig) *Engine {
	engine := &Engine{
		policies: make(map[string]*Policy),
		store:    store,
		config:   config,
	}

	// Initialize cache if enabled
	if config.EnableCache {
		engine.cache = NewPolicyCache(config.CacheMaxSize, config.CacheTTL)
	}

	// Initialize xiezhi client if enabled
	if config.XiezhiEnabled {
		engine.xiezhiClient = xiezhi.NewClient(config.XiezhiURL, config.XiezhiTimeout)
	}

	return engine
}

// Start starts the policy engine
func (e *Engine) Start(ctx context.Context) error {
	// Load policies from store
	if err := e.loadPolicies(); err != nil {
		return fmt.Errorf("load policies: %w", err)
	}

	// Start cache eviction loop if cache is enabled
	if e.cache != nil {
		e.cache.cache.StartEvictionLoop(1 * time.Minute)
	}

	log.Printf("Policy engine started with %d policies", len(e.policies))
	return nil
}

// loadPolicies loads policies from the store
func (e *Engine) loadPolicies() error {
	policies, err := e.store.List()
	if err != nil {
		return err
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	e.policies = make(map[string]*Policy)
	for _, p := range policies {
		e.policies[p.ID] = p
	}

	return nil
}

// AddPolicy adds a policy to the engine
func (e *Engine) AddPolicy(policy *Policy) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	policy.CreatedAt = time.Now()
	policy.UpdatedAt = time.Now()

	if err := e.store.Add(policy); err != nil {
		return err
	}

	e.policies[policy.ID] = policy

	// Add to cache if enabled
	if e.cache != nil {
		e.cache.Put(policy, time.Duration(policy.TTL)*time.Second)
	}

	log.Printf("Added policy: %s", policy.ID)
	return nil
}

// UpdatePolicy updates a policy
func (e *Engine) UpdatePolicy(policy *Policy) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	policy.UpdatedAt = time.Now()

	if err := e.store.Update(policy); err != nil {
		return err
	}

	e.policies[policy.ID] = policy

	// Update cache
	if e.cache != nil {
		e.cache.Put(policy, time.Duration(policy.TTL)*time.Second)
	}

	log.Printf("Updated policy: %s", policy.ID)
	return nil
}

// DeletePolicy deletes a policy
func (e *Engine) DeletePolicy(id string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if err := e.store.Delete(id); err != nil {
		return err
	}

	delete(e.policies, id)

	// Remove from cache
	if e.cache != nil {
		e.cache.Remove(id)
	}

	log.Printf("Deleted policy: %s", id)
	return nil
}

// Evaluate evaluates a request against policies
func (e *Engine) Evaluate(ctx context.Context, req *Request) (*MatchResult, error) {
	// Try local match first if enabled
	if e.config.EnableLocalMatch {
		result := e.evaluateLocal(ctx, req)
		if result != nil {
			return result, nil
		}
	}

	// Try xiezhi if enabled
	if e.xiezhiClient != nil {
		result, err := e.evaluateRemote(ctx, req)
		if err == nil && result != nil {
			return result, nil
		}
		log.Printf("Remote evaluation failed: %v, falling back to local", err)
	}

	// Fallback to local evaluation
	return e.evaluateLocal(ctx, req), nil
}

// evaluateLocal evaluates policies locally
func (e *Engine) evaluateLocal(ctx context.Context, req *Request) *MatchResult {
	e.mu.RLock()
	defer e.mu.RUnlock()

	// Get policies sorted by priority
	matchingPolicies := e.findMatchingPolicies(req.Subject, req.Operation)

	if len(matchingPolicies) == 0 {
		// Default allow if no matching policy
		return &MatchResult{
			Decision: DecisionAllow,
			Reason:   "no matching policy, default allow",
		}
	}

	// Find the highest priority matching policy
	var bestMatch *Policy
	for _, p := range matchingPolicies {
		if bestMatch == nil || p.Priority > bestMatch.Priority {
			// Check conditions
			if e.matchConditions(p, req) {
				bestMatch = p
			}
		}
	}

	if bestMatch == nil {
		return &MatchResult{
			Decision: DecisionAllow,
			Reason:   "no policy matched conditions, default allow",
		}
	}

	return &MatchResult{
		Decision:  Decision(bestMatch.Action),
		PolicyID:  bestMatch.ID,
		Reason:    fmt.Sprintf("matched policy %s", bestMatch.ID),
		Metadata:  bestMatch.Metadata,
		Timestamp: time.Now(),
	}
}

// evaluateRemote evaluates policies via xiezhi
func (e *Engine) evaluateRemote(ctx context.Context, req *Request) (*MatchResult, error) {
	if e.xiezhiClient == nil {
		return nil, fmt.Errorf("xiezhi client not initialized")
	}

	// Build xiezhi request
	xiezhiReq := &xiezhi.AuthRequest{
		Subject:  req.Subject,
		Action:   req.Operation,
		Resource: req.Resource,
		Context:  req.Context,
	}

	// Send to xiezhi
	resp, err := e.xiezhiClient.Evaluate(ctx, xiezhiReq)
	if err != nil {
		return nil, fmt.Errorf("xiezhi evaluation: %w", err)
	}

	// Convert response to match result
	decision := DecisionAllow
	switch resp.Decision {
	case "allow":
		decision = DecisionAllow
	case "deny", "block":
		decision = DecisionBlock
	case "review", "ask":
		decision = DecisionAsk
	}

	return &MatchResult{
		Decision:  decision,
		PolicyID:  resp.PolicyRuleID,
		Reason:    resp.Reason,
		Metadata:  resp.AuditMetadata,
		Timestamp: time.Now(),
	}, nil
}

// findMatchingPolicies finds policies matching the subject and operation
func (e *Engine) findMatchingPolicies(subject, operation string) []*Policy {
	var results []*Policy

	for _, p := range e.policies {
		// Match subject (supports wildcards)
		if !matchPattern(p.Subject, subject) {
			continue
		}

		// Match operation (supports wildcards)
		if !matchPattern(p.Operation, operation) {
			continue
		}

		results = append(results, p)
	}

	// Sort by priority (highest first)
	for i := 0; i < len(results)-1; i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].Priority > results[i].Priority {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	return results
}

// matchPattern checks if a pattern matches a value (supports * and ?)
func matchPattern(pattern, value string) bool {
	// Exact match
	if pattern == value {
		return true
	}

	// Wildcard match
	if pattern == "*" {
		return true
	}

	// Convert glob to regex
	regex := globToRegex(pattern)
	matched, err := regexp.MatchString(regex, value)
	return err == nil && matched
}

// globToRegex converts a glob pattern to regex
func globToRegex(pattern string) string {
	var buf strings.Builder
	buf.WriteString("^")

	for i := 0; i < len(pattern); i++ {
		switch pattern[i] {
		case '*':
			buf.WriteString(".*")
		case '?':
			buf.WriteString(".")
		case '.', '+', '^', '$', '(', ')', '[', ']', '{', '}', '|', '\\':
			buf.WriteString("\\")
			buf.WriteByte(pattern[i])
		default:
			buf.WriteByte(pattern[i])
		}
	}

	buf.WriteString("$")
	return buf.String()
}

// matchConditions checks if all conditions match the request
func (e *Engine) matchConditions(policy *Policy, req *Request) bool {
	if len(policy.Conditions) == 0 {
		return true
	}

	for _, cond := range policy.Conditions {
		if !e.matchCondition(cond, req) {
			return false
		}
	}

	return true
}

// matchCondition checks if a single condition matches
func (e *Engine) matchCondition(cond Condition, req *Request) bool {
	var fieldValue string

	switch cond.Field {
	case "args":
		fieldValue = strings.Join(req.Args, " ")
	case "cwd":
		fieldValue = req.CWD
	case "pid":
		fieldValue = fmt.Sprintf("%d", req.PID)
	case "resource":
		fieldValue = req.Resource
	default:
		if req.Context != nil {
			fieldValue = req.Context[cond.Field]
		}
	}

	switch cond.Operator {
	case "equals":
		return fieldValue == cond.Value
	case "contains":
		return strings.Contains(fieldValue, cond.Value)
	case "starts_with":
		return strings.HasPrefix(fieldValue, cond.Value)
	case "ends_with":
		return strings.HasSuffix(fieldValue, cond.Value)
	case "matches":
		matched, _ := regexp.MatchString(cond.Value, fieldValue)
		return matched
	case "path_prefix":
		return strings.HasPrefix(fieldValue, cond.Value)
	case "path_contains":
		// Extract path components
		filename := path.Base(fieldValue)
		return strings.Contains(filename, cond.Value)
	}

	return false
}

// Reload reloads policies from the store
func (e *Engine) Reload() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Clear cache
	if e.cache != nil {
		e.cache.Clear()
	}

	return e.loadPolicies()
}

// GetPolicy returns a policy by ID
func (e *Engine) GetPolicy(id string) (*Policy, bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	p, ok := e.policies[id]
	return p, ok
}

// ListPolicies returns all policies
func (e *Engine) ListPolicies() []*Policy {
	e.mu.RLock()
	defer e.mu.RUnlock()

	result := make([]*Policy, 0, len(e.policies))
	for _, p := range e.policies {
		result = append(result, p)
	}
	return result
}

// SyncPolicies synchronizes policies from xiezhi
func (e *Engine) SyncPolicies(ctx context.Context) error {
	if e.xiezhiClient == nil {
		return fmt.Errorf("xiezhi client not initialized")
	}

	policies, err := e.xiezhiClient.FetchPolicies(ctx)
	if err != nil {
		return fmt.Errorf("fetch policies: %w", err)
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	// Update local store
	for _, p := range policies {
		if err := e.store.Update(p); err != nil {
			log.Printf("Failed to update policy %s: %v", p.ID, err)
			continue
		}
		e.policies[p.ID] = p
	}

	log.Printf("Synced %d policies from xiezhi", len(policies))
	return nil
}

// SetXiezhiClient sets the xiezhi client
func (e *Engine) SetXiezhiClient(client *xiezhi.Client) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.xiezhiClient = client
}

// DefaultEngine creates an engine with default configuration
func DefaultEngine(store PolicyStore, xiezhiURL string) *Engine {
	config := EngineConfig{
		EnableCache:      true,
		CacheTTL:         5 * time.Minute,
		CacheMaxSize:     1000,
		XiezhiEnabled:    xiezhiURL != "",
		XiezhiURL:        xiezhiURL,
		XiezhiTimeout:    10 * time.Second,
		EnableLocalMatch: true,
	}

	return NewEngine(store, config)
}
