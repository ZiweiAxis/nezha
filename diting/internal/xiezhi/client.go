// Package xiezhi provides a client for communicating with the Xiezhi (獬豸) policy service.
package xiezhi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// Client represents a client for the Xiezhi policy service
type Client struct {
	baseURL    string
	httpClient *http.Client
	timeout    time.Duration
}

// AuthRequest represents an authentication request to Xiezhi
type AuthRequest struct {
	Subject    string            `json:"subject"`
	Action     string            `json:"action"`
	Resource   string            `json:"resource"`
	Context    map[string]string `json:"context,omitempty"`
	Command    string            `json:"command,omitempty"`
	WorkingDir string            `json:"working_dir,omitempty"`
	PID        int               `json:"pid,omitempty"`
	TraceID    string            `json:"trace_id,omitempty"`
	Env        map[string]string `json:"env,omitempty"`
}

// AuthResponse represents an authentication response from Xiezhi
type AuthResponse struct {
	Decision        string            `json:"decision"`
	PolicyRuleID    string            `json:"policy_rule_id"`
	Reason          string            `json:"reason"`
	CheqID          string            `json:"cheq_id,omitempty"`
	ApprovalTimeout int32             `json:"approval_timeout_sec,omitempty"`
	AuditMetadata   map[string]string `json:"audit_metadata,omitempty"`
}

// Policy represents a policy rule from Xiezhi
type Policy struct {
	ID         string            `json:"id"`
	Action     string            `json:"action"`
	Subject    string            `json:"subject"`
	Operation  string            `json:"operation"`
	Resource   string            `json:"resource"`
	Priority   int               `json:"priority"`
	TTL        int64             `json:"ttl"`
	Conditions []Condition       `json:"conditions,omitempty"`
	Metadata   map[string]string `json:"metadata,omitempty"`
	CreatedAt  time.Time         `json:"created_at"`
	UpdatedAt  time.Time         `json:"updated_at"`
}

// Condition represents a policy condition
type Condition struct {
	Type     string `json:"type"`
	Field    string `json:"field"`
	Operator string `json:"operator"`
	Value    string `json:"value"`
}

// ApprovalRequest represents an approval request to Xiezhi
type ApprovalRequest struct {
	CheqID     string `json:"cheq_id"`
	Decision   string `json:"decision"`
	Reason     string `json:"reason"`
	ApprovedBy string `json:"approved_by,omitempty"`
}

// ApprovalResponse represents an approval response from Xiezhi
type ApprovalResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// SandboxProfile represents a sandbox profile from Xiezhi
type SandboxProfile struct {
	ProfileID         string           `json:"profile_id"`
	Version           string           `json:"version"`
	NetworkEnabled    bool             `json:"network_enabled"`
	FSWritablePaths   []string         `json:"fs_writable_paths,omitempty"`
	SyscallPreset     string           `json:"syscall_preset"`
	MaxMemoryMB       int64            `json:"max_memory_mb"`
	ReadonlyRoot      bool             `json:"readonly_root"`
	HotCacheActions   []HotCacheAction `json:"hot_cache_actions,omitempty"`
	DegradationPolicy string           `json:"degradation_policy"`
}

// HotCacheAction represents a hot cache action
type HotCacheAction struct {
	Executable    string   `json:"executable"`
	ArgsAllowlist []string `json:"argv_allowlist,omitempty"`
	RunAsSudo     bool     `json:"run_as_sudo"`
}

// ErrorResponse represents an error response from Xiezhi
type ErrorResponse struct {
	Error   string `json:"error"`
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
}

// NewClient creates a new Xiezhi client
func NewClient(baseURL string, timeout time.Duration) *Client {
	if baseURL == "" {
		baseURL = "http://localhost:8080" // Default Xiezhi port
	}

	if timeout == 0 {
		timeout = 10 * time.Second
	}

	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: timeout,
			Transport: &http.Transport{
				MaxIdleConns:        10,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     30 * time.Second,
			},
		},
		timeout: timeout,
	}
}

// Evaluate sends an authentication request to Xiezhi
func (c *Client) Evaluate(ctx context.Context, req *AuthRequest) (*AuthResponse, error) {
	// Add trace ID if not present
	if req.TraceID == "" {
		req.TraceID = uuid.New().String()
	}

	// Build request
	url := c.baseURL + "/api/v1/auth/exec"
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		var errResp ErrorResponse
		if json.Unmarshal(respBody, &errResp) == nil {
			return nil, fmt.Errorf("xiezhi error: [%d] %s", resp.StatusCode, errResp.Message)
		}
		return nil, fmt.Errorf("xiezhi error: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	// Parse response
	var authResp AuthResponse
	if err := json.Unmarshal(respBody, &authResp); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	return &authResp, nil
}

// EvaluateStream sends a streaming authentication request to Xiezhi
func (c *Client) EvaluateStream(ctx context.Context, req *AuthRequest, handler func(*AuthResponse) error) error {
	// Add trace ID if not present
	if req.TraceID == "" {
		req.TraceID = uuid.New().String()
	}

	// Build request
	url := c.baseURL + "/api/v1/auth/stream"
	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "text/event-stream")

	// Send request
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	// Read streaming response
	decoder := json.NewDecoder(resp.Body)
	for decoder.More() {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		var authResp AuthResponse
		if err := decoder.Decode(&authResp); err != nil {
			return fmt.Errorf("decode response: %w", err)
		}

		if err := handler(&authResp); err != nil {
			return err
		}
	}

	return nil
}

// FetchPolicies fetches all policies from Xiezhi
func (c *Client) FetchPolicies(ctx context.Context) ([]*Policy, error) {
	url := c.baseURL + "/api/v1/policies"

	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("xiezhi error: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	// Parse response
	var policies []*Policy
	if err := json.NewDecoder(resp.Body).Decode(&policies); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	return policies, nil
}

// GetPolicy fetches a specific policy from Xiezhi
func (c *Client) GetPolicy(ctx context.Context, id string) (*Policy, error) {
	url := c.baseURL + "/api/v1/policies/" + id

	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("xiezhi error: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	// Parse response
	var policy Policy
	if err := json.NewDecoder(resp.Body).Decode(&policy); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	return &policy, nil
}

// SubmitApproval submits an approval decision to Xiezhi
func (c *Client) SubmitApproval(ctx context.Context, req *ApprovalRequest) (*ApprovalResponse, error) {
	url := c.baseURL + "/api/v1/approvals"
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("xiezhi error: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	// Parse response
	var approvalResp ApprovalResponse
	if err := json.NewDecoder(resp.Body).Decode(&approvalResp); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	return &approvalResp, nil
}

// GetApprovalStatus gets the status of an approval request
func (c *Client) GetApprovalStatus(ctx context.Context, cheqID string) (*AuthResponse, error) {
	url := c.baseURL + "/api/v1/approvals/" + cheqID

	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("xiezhi error: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	// Parse response
	var authResp AuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&authResp); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	return &authResp, nil
}

// GetSandboxProfile fetches a sandbox profile from Xiezhi
func (c *Client) GetSandboxProfile(ctx context.Context, resource, agentVersion string) (*SandboxProfile, error) {
	url := c.baseURL + "/api/v1/sandbox/profile?resource=" + resource + "&agent_version=" + agentVersion

	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("xiezhi error: status %d, body: %s", resp.StatusCode, string(respBody))
	}

	// Parse response
	var profile SandboxProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	return &profile, nil
}

// HealthCheck checks if Xiezhi is healthy
func (c *Client) HealthCheck(ctx context.Context) error {
	url := c.baseURL + "/health"

	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("xiezhi unhealthy: status %d", resp.StatusCode)
	}

	return nil
}

// WaitForApproval waits for an approval response from Xiezhi
func (c *Client) WaitForApproval(ctx context.Context, cheqID string, timeout time.Duration) (*AuthResponse, error) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	deadline := time.Now().Add(timeout)

	for {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-ticker.C:
			if time.Now().After(deadline) {
				return nil, fmt.Errorf("approval timeout")
			}

			resp, err := c.GetApprovalStatus(ctx, cheqID)
			if err != nil {
				log.Printf("Failed to get approval status: %v", err)
				continue
			}

			// Check if decision is made
			if resp.Decision != "" && resp.Decision != "pending" {
				return resp, nil
			}
		}
	}
}

// SetTimeout sets the request timeout
func (c *Client) SetTimeout(timeout time.Duration) {
	c.timeout = timeout
	c.httpClient.Timeout = timeout
}

// GetBaseURL returns the base URL
func (c *Client) GetBaseURL() string {
	return c.baseURL
}
