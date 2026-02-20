// Package policy provides policy caching and matching engine for Diting.
package policy

import (
	"container/list"
	"fmt"
	"sync"
	"time"
)

// Policy represents a security policy rule
type Policy struct {
	ID         string            `json:"id"`
	Action     string            `json:"action"`    // "allow", "block", "review"
	Subject    string            `json:"subject"`   // agent/sandbox ID pattern
	Operation  string            `json:"operation"` // e.g., "exec:run", "exec:fs.write"
	Resource   string            `json:"resource"`  // e.g., "/bin/bash", "docker://container-1"
	Priority   int               `json:"priority"`  // higher = more important
	TTL        int64             `json:"ttl"`       // time-to-live in seconds, -1 for permanent
	CreatedAt  time.Time         `json:"created_at"`
	UpdatedAt  time.Time         `json:"updated_at"`
	Conditions []Condition       `json:"conditions"` // additional matching conditions
	Metadata   map[string]string `json:"metadata"`
}

// Condition represents a policy matching condition
type Condition struct {
	Type     string `json:"type"`     // "path_prefix", "path_contains", "equals", "regex"
	Field    string `json:"field"`    // "args", "env", "cwd", "parent_pid"
	Operator string `json:"operator"` // "equals", "contains", "starts_with", "matches"
	Value    string `json:"value"`
}

// CacheEntry represents a cached policy entry
type CacheEntry struct {
	Policy    *Policy
	ExpiresAt time.Time
	AccessCnt int // access count for LFU
}

// Cache is an LRU/LFU cache for policy data
type Cache struct {
	mu            sync.RWMutex
	byKey         map[string]*list.Element
	byAccessOrder *list.List // LRU order
	byFreqOrder   *list.List // LFU order
	maxSize       int
	maxMemorySize int // in bytes
	defaultTTL    time.Duration
	stats         CacheStats
}

// CacheStats holds cache statistics
type CacheStats struct {
	Hits   int64
	Misses int64
	Evicts int64
	Errors int64
}

// NewCache creates a new policy cache
func NewCache(maxSize int, defaultTTL time.Duration) *Cache {
	return &Cache{
		byKey:         make(map[string]*list.Element),
		byAccessOrder: list.New(),
		byFreqOrder:   list.New(),
		maxSize:       maxSize,
		defaultTTL:    defaultTTL,
		stats:         CacheStats{},
	}
}

// Get retrieves a policy from cache
func (c *Cache) Get(key string) (*Policy, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	elem, ok := c.byKey[key]
	if !ok {
		c.stats.Misses++
		return nil, false
	}

	entry := elem.Value.(*CacheEntry)

	// Check if expired
	if !entry.ExpiresAt.IsZero() && time.Now().After(entry.ExpiresAt) {
		c.removeElement(elem)
		c.stats.Misses++
		return nil, false
	}

	// Update LRU
	c.byAccessOrder.MoveToFront(elem)

	// Update access count for LFU
	entry.AccessCnt++

	c.stats.Hits++
	return entry.Policy, true
}

// Put stores a policy in cache
func (c *Cache) Put(key string, policy *Policy, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Use default TTL if not specified
	if ttl == 0 {
		ttl = c.defaultTTL
	}

	// Check if key already exists
	if elem, ok := c.byKey[key]; ok {
		c.removeElement(elem)
	}

	// Evict if at capacity
	if len(c.byKey) >= c.maxSize {
		c.evictLRU()
	}

	expiresAt := time.Time{}
	if ttl > 0 {
		expiresAt = time.Now().Add(ttl)
	}

	entry := &CacheEntry{
		Policy:    policy,
		ExpiresAt: expiresAt,
		AccessCnt: 1,
	}

	elem := c.byAccessOrder.PushFront(entry)
	c.byKey[key] = elem
}

// Remove removes a policy from cache
func (c *Cache) Remove(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if elem, ok := c.byKey[key]; ok {
		c.removeElement(elem)
	}
}

// Clear removes all entries from cache
func (c *Cache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.byKey = make(map[string]*list.Element)
	c.byAccessOrder = list.New()
	c.byFreqOrder = list.New()
}

// Size returns the number of cached items
func (c *Cache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.byKey)
}

// Stats returns cache statistics
func (c *Cache) Stats() CacheStats {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.stats
}

// removeElement removes an element from both maps and lists
func (c *Cache) removeElement(elem *list.Element) {
	c.byAccessOrder.Remove(elem)
	delete(c.byKey, elem.Value.(*CacheEntry).Policy.ID)
	c.stats.Evicts++
}

// evictLRU evicts the least recently used item
func (c *Cache) evictLRU() {
	if elem := c.byAccessOrder.Back(); elem != nil {
		c.removeElement(elem)
	}
}

// evictTTL expired entries
func (c *Cache) evictTTL() {
	now := time.Now()

	for elem := c.byAccessOrder.Back(); elem != nil; elem = elem.Prev() {
		entry := elem.Value.(*CacheEntry)
		if !entry.ExpiresAt.IsZero() && now.After(entry.ExpiresAt) {
			c.removeElement(elem)
		}
	}
}

// StartEvictionLoop starts a background goroutine to evict expired entries
func (c *Cache) StartEvictionLoop(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		for range ticker.C {
			c.mu.Lock()
			c.evictTTL()
			c.mu.Unlock()
		}
	}()
}

// PolicyCache is a specialized cache for policies
type PolicyCache struct {
	cache        *Cache
	matchIndex   map[string][]string // operation -> policy IDs
	matchIndexMu sync.RWMutex
}

// NewPolicyCache creates a new policy cache
func NewPolicyCache(maxSize int, defaultTTL time.Duration) *PolicyCache {
	return &PolicyCache{
		cache:      NewCache(maxSize, defaultTTL),
		matchIndex: make(map[string][]string),
	}
}

// Get retrieves a policy by key
func (pc *PolicyCache) Get(key string) (*Policy, bool) {
	return pc.cache.Get(key)
}

// Put stores a policy
func (pc *PolicyCache) Put(policy *Policy, ttl time.Duration) {
	pc.cache.Put(policy.ID, policy, ttl)

	// Update match index
	pc.matchIndexMu.Lock()
	defer pc.matchIndexMu.Unlock()

	key := fmt.Sprintf("%s:%s", policy.Subject, policy.Operation)
	pc.matchIndex[key] = append(pc.matchIndex[key], policy.ID)
}

// GetByOperation retrieves policies matching an operation
func (pc *PolicyCache) GetByOperation(subject, operation string) []*Policy {
	pc.matchIndexMu.RLock()
	defer pc.matchIndexMu.RUnlock()

	key := fmt.Sprintf("%s:%s", subject, operation)
	policyIDs := pc.matchIndex[key]

	results := make([]*Policy, 0, len(policyIDs))
	for _, id := range policyIDs {
		if policy, ok := pc.cache.Get(id); ok {
			results = append(results, policy)
		}
	}

	return results
}

// Remove removes a policy
func (pc *PolicyCache) Remove(id string) {
	pc.cache.Remove(id)

	// Clean up match index
	pc.matchIndexMu.Lock()
	defer pc.matchIndexMu.Unlock()

	for key, ids := range pc.matchIndex {
		newIDs := make([]string, 0)
		for _, pid := range ids {
			if pid != id {
				newIDs = append(newIDs, pid)
			}
		}
		pc.matchIndex[key] = newIDs
	}
}

// Clear clears all cached policies
func (pc *PolicyCache) Clear() {
	pc.cache.Clear()

	pc.matchIndexMu.Lock()
	defer pc.matchIndexMu.Unlock()
	pc.matchIndex = make(map[string][]string)
}

// Refresh reloads a specific policy
func (pc *PolicyCache) Refresh(id string) error {
	// This should be implemented to fetch from the policy engine
	// In a real implementation, this would call the policy engine to reload the policy
	return nil
}

// RefreshAll clears and reloads all policies
func (pc *PolicyCache) RefreshAll(policies []Policy) error {
	pc.Clear()

	for i := range policies {
		pc.Put(&policies[i], time.Duration(policies[i].TTL)*time.Second)
	}

	return nil
}

// CachePolicyStore implements a cache-backed policy store
type CachePolicyStore struct {
	cache *PolicyCache
}

// NewCachePolicyStore creates a new cache-backed policy store
func NewCachePolicyStore(maxSize int, defaultTTL time.Duration) *CachePolicyStore {
	return &CachePolicyStore{
		cache: NewPolicyCache(maxSize, defaultTTL),
	}
}

// Get retrieves a policy by ID
func (s *CachePolicyStore) Get(id string) (*Policy, bool) {
	return s.cache.Get(id)
}

// List retrieves all policies
func (s *CachePolicyStore) List() ([]*Policy, error) {
	// This would need to be implemented to return all cached policies
	return nil, nil
}

// Add adds a policy
func (s *CachePolicyStore) Add(policy *Policy) error {
	s.cache.Put(policy, time.Duration(policy.TTL)*time.Second)
	return nil
}

// Update updates a policy
func (s *CachePolicyStore) Update(policy *Policy) error {
	s.cache.Put(policy, time.Duration(policy.TTL)*time.Second)
	return nil
}

// Delete deletes a policy
func (s *CachePolicyStore) Delete(id string) error {
	s.cache.Remove(id)
	return nil
}

// Clear clears all policies
func (s *CachePolicyStore) Clear() error {
	s.cache.Clear()
	return nil
}

// StartEvictionLoop starts the cache eviction loop
func (s *CachePolicyStore) StartEvictionLoop(interval time.Duration) {
	s.cache.cache.StartEvictionLoop(interval)
}
