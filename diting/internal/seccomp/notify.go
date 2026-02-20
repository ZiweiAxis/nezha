// Package seccomp provides seccomp notification handling for Diting.
// This implementation handles seccomp notifications from the kernel via
// SECCOMP_GET_NOTIF_FD ioctl.
package seccomp

import (
	"encoding/binary"
	"fmt"
	"log"
	"os"
	"sync"
	"syscall"
	"unsafe"

	"golang.org/x/sys/unix"
)

// Notification represents a seccomp notification from the kernel
type Notification struct {
	ID         uint64
	PID        int
	SyscallNum uint32
	Args       [6]uint64
	Arch       uint32
	Code       uint32
	Flags      uint32
}

// Notifier handles seccomp notifications from the kernel
type Notifier struct {
	fd       int
	notifyFD int
	mu       sync.RWMutex
	wg       sync.WaitGroup
	running  bool
	stopCh   chan struct{}
	handlers []NotificationHandler
}

// NotificationHandler handles seccomp notifications
type NotificationHandler interface {
	HandleNotification(n *Notification) Decision
}

// Decision represents the decision for a seccomp notification
type Decision int

const (
	DecisionAllow Decision = 1
	DecisionBlock Decision = 2
	DecisionAsk   Decision = 3
)

// seccomp_notif is the kernel structure for seccomp notifications
// C equivalent:
//
//	struct seccomp_notif {
//	    __u32 id;
//	    __u32 pid;
//	    __u32 arch;
//	    __u32 instruction_count;
//	    __u64 instruction_pointer;
//	    __u64 args[6];
//	    __u32 data;
//	    __u16 flags;
//	    __u16 reserved;
//	};
type seccompNotif struct {
	ID                 uint32
	PID                uint32
	Arch               uint32
	InstructionCount   uint32
	InstructionPointer uint64
	Args               [6]uint64
	Data               uint32
	Flags              uint16
	_                  uint16
}

// seccomp_notif_resp is the kernel structure for notification responses
// C equivalent:
//
//	struct seccomp_notif_resp {
//	    __u32 id;
//	    __s64 val;
//	    __s32 error;
//	    __u32 flags;
//	    __u32 reserved;
//	};
type seccompNotifResp struct {
	ID    uint32
	Val   int64
	Error int32
	Flags uint32
	_     uint32
}

const (
	seccompNotifFlagContinue = 0x1
	seccompIOCGNotifFD       = 0x40086c00 // SECCOMP_IOCTL_NOTIF_FD
	seccompIOCGNotifAdd      = 0x40124c01 // SECCOMP_IOCTL_NOTIF_ADDS
	seccompIOCSendSyscallRet = 0x40124c03 // SECCOMP_IOCTL_SYSCALL_RET
)

// NewNotifier creates a new seccomp notifier
func NewNotifier(fd int) (*Notifier, error) {
	// Get notification file descriptor via ioctl
	notifyFD, _, err := unix.IoctlGetInt(fd, seccompIOCGNotifFD)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification fd: %w", err)
	}

	return &Notifier{
		fd:       fd,
		notifyFD: notifyFD,
		stopCh:   make(chan struct{}),
		handlers: make([]NotificationHandler, 0),
	}, nil
}

// AddHandler adds a notification handler
func (n *Notifier) AddHandler(handler NotificationHandler) {
	n.mu.Lock()
	defer n.mu.Unlock()
	n.handlers = append(n.handlers, handler)
}

// Start starts the notification loop
func (n *Notifier) Start() {
	n.mu.Lock()
	if n.running {
		n.mu.Unlock()
		return
	}
	n.running = true
	n.mu.Unlock()

	n.wg.Add(1)
	go n.loop()
	log.Printf("Seccomp notifier started, notify fd: %d", n.notifyFD)
}

// Stop stops the notification loop
func (n *Notifier) Stop() {
	n.mu.Lock()
	if !n.running {
		n.mu.Unlock()
		return
	}
	n.running = false
	n.mu.Unlock()

	close(n.stopCh)
	n.wg.Wait()

	if n.notifyFD > 0 {
		unix.Close(n.notifyFD)
	}
	log.Println("Seccomp notifier stopped")
}

// GetNotifyFD returns the notification file descriptor
func (n *Notifier) GetNotifyFD() int {
	return n.notifyFD
}

// loop processes seccomp notifications
func (n *Notifier) loop() {
	defer n.wg.Done()

	for {
		select {
		case <-n.stopCh:
			return
		default:
		}

		// Set up poll for notification fd
		pollFD := []unix.PollFd{
			{Fd: int32(n.notifyFD), Events: unix.POLLIN},
		}

		// Wait for notification with timeout
		nready, err := unix.Poll(pollFD, 100) // 100ms timeout
		if err != nil {
			if err == unix.EINTR {
				continue
			}
			log.Printf("Poll error: %v", err)
			continue
		}

		if nready == 0 {
			continue
		}

		// Read notification
		notif, err := n.readNotification()
		if err != nil {
			log.Printf("Failed to read notification: %v", err)
			continue
		}

		// Process notification
		n.processNotification(notif)
	}
}

// readNotification reads a seccomp notification from the fd
func (n *Notifier) readNotification() (*Notification, error) {
	var req seccompNotif

	// Read the notification from the fd
	nr, err := unix.Read(n.notifyFD, (*(*[unsafe.Sizeof(req)]byte)(unsafe.Pointer(&req)))[:])
	if err != nil {
		return nil, fmt.Errorf("read notification: %w", err)
	}
	if nr != unsafe.Sizeof(req) {
		return nil, fmt.Errorf("incomplete notification read: got %d, want %d", nr, unsafe.Sizeof(req))
	}

	return &Notification{
		ID:         uint64(req.ID),
		PID:        int(req.PID),
		SyscallNum: req.Data,
		Args:       req.Args,
		Arch:       req.Arch,
	}, nil
}

// processNotification processes a single notification
func (n *Notifier) processNotification(notif *Notification) {
	n.mu.RLock()
	handlers := make([]NotificationHandler, len(n.handlers))
	copy(handlers, n.handlers)
	n.mu.RUnlock()

	// Process through all handlers
	for _, handler := range handlers {
		decision := handler.HandleNotification(notif)
		n.sendResponse(notif.ID, decision)
	}
}

// sendResponse sends the response back to the kernel
func (n *Notifier) sendResponse(id uint64, decision Decision) error {
	var resp seccompNotifResp
	resp.ID = uint32(id)

	switch decision {
	case DecisionAllow:
		resp.Val = 0
		resp.Error = 0
	case DecisionBlock:
		resp.Val = 0
		resp.Error = -int32(syscall.EPERM)
	case DecisionAsk:
		// Return error to pause the process while we ask for approval
		resp.Val = 0
		resp.Error = -int32(syscall.ERESTARTNOHAND)
		resp.Flags = seccompNotifFlagContinue
	}

	_, err := unix.Write(n.notifyFD, (*(*[unsafe.Sizeof(resp)]byte)(unsafe.Pointer(&resp)))[:])
	if err != nil {
		return fmt.Errorf("send response: %w", err)
	}

	return nil
}

// CreateNotifyFD creates a seccomp notify file descriptor
func CreateNotifyFD() (int, error) {
	// Create a seccomp filter with notification
	fd, err := unix.SeccompInit(unix.SECCOMP_RET_USER_NOTIF)
	if err != nil {
		return -1, fmt.Errorf("seccomp_init: %w", err)
	}

	return fd, nil
}

// AddSyscallFilter adds a syscall filter with notification
func AddSyscallFilter(fd int, syscallNum uint32) error {
	// Add a filter that triggers notification for specific syscalls
	// SECCOMP_RET_USER_NOTIF = 0x7fc00000
	// The filter will be triggered for the specified syscall
	_, err := unix.SeccompAddFilterRaw(fd, []byte{
		// BPF_STMT(BPF_LD | BPF_W | BPF_ABS, arch_offset),
		0x20, 0, 0, 0, // arch
		// BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, AUDIT_ARCH_X86_64, 0, 3),
		0x15, 0, 0, 0x3e, 0x00, 0x00, 0x00, // skip if not x86_64
		// BPF_STMT(BPF_LD | BPF_W | BPF_ABS, nr_offset),
		0x20, 0, 0, 0, // nr
		// BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, syscallNum, 0, 1),
		0x15, 0, 0, 0, byte(syscallNum), 0, 0, 0, // match syscall
		// BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_USER_NOTIF),
		0x06, 0, 0, 0, 0x7f, 0xc0, 0x00, 0x00,
		// BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
		0x06, 0, 0, 0, 0x7f, 0xff, 0xff, 0x7f,
	})
	return err
}

// EnableSeccomp enables seccomp mode 2 (SECCOMP_MODE_FILTER)
func EnableSeccomp(fd int) error {
	return unix.Prctl(unix.PR_SET_SECCOMP, unix.SECCOMP_MODE_FILTER, fd, 0, 0)
}
