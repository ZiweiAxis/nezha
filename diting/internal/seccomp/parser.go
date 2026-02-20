// Package seccomp provides syscall parsing utilities for seccomp notifications.
package seccomp

import (
	"bytes"
	"encoding/hex"
	"fmt"
	"path"
	"strings"
	"syscall"

	"golang.org/x/sys/unix"
)

// SyscallName returns the name of a syscall
func SyscallName(num uint32) string {
	// Common syscalls
	syscalls := map[uint32]string{
		0:   "read",
		1:   "write",
		2:   "open",
		3:   "close",
		4:   "stat",
		5:   "fstat",
		6:   "lstat",
		7:   "poll",
		8:   "lseek",
		9:   "mmap",
		10:  "mprotect",
		11:  "munmap",
		12:  "brk",
		13:  "rt_sigaction",
		14:  "rt_sigprocmask",
		15:  "rt_sigreturn",
		16:  "ioctl",
		17:  "pread64",
		18:  "pwrite64",
		19:  "readv",
		20:  "writev",
		21:  "access",
		22:  "pipe",
		23:  "select",
		24:  "mremap",
		25:  "msync",
		26:  "mincore",
		27:  "madvise",
		28:  "shmget",
		29:  "shmat",
		30:  "shmctl",
		31:  "dup",
		32:  "dup2",
		33:  "pause",
		34:  "nanosleep",
		35:  "getitimer",
		36:  "alarm",
		37:  "setitimer",
		38:  "getpid",
		39:  "socket",
		40:  "connect",
		41:  "accept",
		42:  "sendto",
		43:  "recvfrom",
		44:  "sendmsg",
		45:  "recvmsg",
		46:  "shutdown",
		47:  "bind",
		48:  "listen",
		49:  "getsockname",
		50:  "getpeername",
		51:  "socketpair",
		52:  "setsockopt",
		53:  "getsockopt",
		54:  "clone",
		55:  "fork",
		56:  "vfork",
		57:  "execve",
		58:  "exit",
		59:  "wait4",
		60:  "kill",
		61:  "uname",
		62:  "semget",
		63:  "semop",
		64:  "semctl",
		65:  "shmdt",
		66:  "msgget",
		67:  "msgsnd",
		68:  "msgrcv",
		69:  "msgctl",
		70:  "msgget",
		71:  "fcntl",
		72:  "flock",
		73:  "fsync",
		74:  "fdatasync",
		75:  "truncate",
		76:  "ftruncate",
		77:  "getdents",
		78:  "getcwd",
		79:  "chdir",
		80:  "fchdir",
		81:  "rename",
		82:  "mkdir",
		83:  "rmdir",
		84:  "creat",
		85:  "link",
		86:  "unlink",
		87:  "symlink",
		88:  "readlink",
		89:  "chmod",
		90:  "fchmod",
		91:  "chown",
		92:  "fchown",
		93:  "lchown",
		94:  "umask",
		95:  "gettimeofday",
		96:  "getrlimit",
		97:  "getrusage",
		98:  "sysinfo",
		99:  "times",
		100: "ptrace",
		101: "getuid",
		102: "syslog",
		103: "getgid",
		104: "setuid",
		105: "setgid",
		106: "geteuid",
		107: "getegid",
		108: "setpgid",
		109: "getppid",
		110: "getsid",
		111: "setreuid",
		112: "setregid",
		113: "getgroups",
		114: "setgroups",
		115: "setresuid",
		116: "getresuid",
		117: "setresgid",
		118: "getresgid",
		119: "getpgid",
		120: "setfsuid",
		121: "setfsgid",
		122: "getsid",
		123: "capget",
		124: "capset",
		125: "rt_sigpending",
		126: "rt_sigtimedwait",
		127: "rt_sigqueueinfo",
		128: "rt_sigsuspend",
		129: "sigaltstack",
		130: "utime",
		131: "mknod",
		132: "uselib",
		133: "personality",
		134: "ustat",
		135: "statfs",
		136: "fstatfs",
		137: "sysfs",
		138: "getpriority",
		139: "setpriority",
		140: "sched_setparam",
		141: "sched_getparam",
		142: "sched_setscheduler",
		143: "sched_getscheduler",
		144: "sched_get_priority_max",
		145: "sched_get_priority_min",
		146: "sched_rr_get_interval",
		147: "mlock",
		148: "munlock",
		149: "mlockall",
		150: "munlockall",
		151: "vhangup",
		152: "pivot_root",
		153: "prctl",
		154: "arch_prctl",
		155: "adjtimex",
		156: "setrlimit",
		157: "chroot",
		158: "sync",
		159: "acct",
		160: "settimeofday",
		161: "mount",
		162: "umount2",
		163: "swapon",
		164: "swapoff",
		165: "reboot",
		166: "setdomainname",
		167: "iopl",
		168: "ioperm",
		169: "init_module",
		170: "delete_module",
		171: "quotactl",
		172: "gettid",
		173: "readahead",
		174: "setxattr",
		175: "lsetxattr",
		176: "fsetxattr",
		177: "getxattr",
		178: "lgetxattr",
		179: "fgetxattr",
		180: "listxattr",
		181: "llistxattr",
		182: "flistxattr",
		183: "removexattr",
		184: "lremovexattr",
		185: "fremovexattr",
		186: "tkill",
		187: "time",
		188: "futex",
		189: "sched_setaffinity",
		190: "sched_getaffinity",
		191: "io_setup",
		192: "io_destroy",
		193: "io_getevents",
		194: "io_submit",
		195: "io_cancel",
		196: "lookup_dcookie",
		197: "epoll_create",
		198: "remap_file_pages",
		199: "set_tid_address",
		200: "timer_create",
		201: "timer_settime",
		202: "timer_gettime",
		203: "timer_getoverrun",
		204: "timer_delete",
		205: "timerfd_create",
		206: "eventfd2",
		207: "epoll_wait",
		208: "epoll_ctl",
		209: "timerfd_create",
		210: "timerfd_settime",
		211: "timerfd_gettime",
		212: "accept4",
		213: "signalfd4",
		214: "eventfd2",
		215: "epoll_create1",
		216: "dup3",
		217: "pipe2",
		218: "inotify_init1",
		219: "preadv",
		220: "pwritev",
		221: "rt_tgsigqueueinfo",
		222: "perf_event_open",
		223: "recvmmsg",
		224: "fanotify_init",
		225: "fanotify_mark",
		226: "prlimit64",
		227: "name_to_handle_at",
		228: "open_by_handle_at",
		229: "clock_adjtime",
		230: "syncfs",
		231: "sendmmsg",
		232: "setns",
		233: "getcpu",
		234: "process_vm_readv",
		235: "process_vm_writev",
		236: "kcmp",
		237: "finit_module",
		238: "sched_setattr",
		239: "sched_getattr",
		240: "renameat2",
		241: "seccomp",
		242: "getrandom",
		243: "memfd_create",
		244: "kexec_file_load",
		257: "execveat",
		258: "userfaultfd",
		259: "membarrier",
		260: "mlock2",
		261: "copy_file_range",
		262: "preadv2",
		263: "pwritev2",
		264: "pkey_mprotect",
		265: "pkey_alloc",
		266: "pkey_free",
		267: "statx",
		268: "io_pgetevents",
		269: "rseq",
		270: "pidfd_send_signal",
		271: "io_uring_setup",
		272: "io_uring_enter",
		273: "io_uring_register",
		274: "open_tree",
		275: "move_mount",
		276: "fsopen",
		277: "fsconfig",
		278: "fsmount",
		279: "fspick",
		280: "pidfd_open",
		281: "close_range",
		282: "openat2",
		283: "pidfd_getfd",
		284: "faccessat2",
		285: "process_madvise",
		286: "epoll_pwait2",
		287: "mount_setattr",
		288: "quotactl_fd",
		289: "landlock_create_ruleset",
		290: "landlock_add_rule",
		291: "landlock_restrict_self",
		292: "memfd_secret",
		293: "map_shadow_stack",
	}

	if name, ok := syscalls[num]; ok {
		return name
	}
	return fmt.Sprintf("syscall_%d", num)
}

// OperationType represents the type of operation
type OperationType string

const (
	OpRead    OperationType = "read"
	OpWrite   OperationType = "write"
	OpExec    OperationType = "exec"
	OpConnect OperationType = "connect"
	OpOpen    OperationType = "open"
	OpCreate  OperationType = "create"
	OpDelete  OperationType = "delete"
	OpModify  OperationType = "modify"
	OpMount   OperationType = "mount"
	OpNetwork OperationType = "network"
	OpProcess OperationType = "process"
	OpMemory  OperationType = "memory"
	OpSignal  OperationType = "signal"
	OpIPC     OperationType = "ipc"
	OpUnknown OperationType = "unknown"
)

// ParsedSyscall represents a parsed syscall with extracted information
type ParsedSyscall struct {
	SyscallNum  uint32
	SyscallName string
	Operation   OperationType
	Target      string
	Flags       uint64
	PID         int
	UID         uint32
	GID         uint32
	Args        []string
	RawArgs     [6]uint64
}

// SyscallClassifier classifies syscalls into operation types
var SyscallClassifier = map[uint32]OperationType{
	0:   OpRead,
	1:   OpWrite,
	2:   OpOpen,
	3:   OpClose,
	9:   OpMemory,
	10:  OpMemory,
	11:  OpMemory,
	12:  OpMemory,
	21:  OpRead,
	22:  OpWrite,
	39:  OpNetwork,
	40:  OpNetwork,
	41:  OpNetwork,
	42:  OpNetwork,
	43:  OpNetwork,
	44:  OpNetwork,
	45:  OpNetwork,
	46:  OpNetwork,
	47:  OpNetwork,
	48:  OpNetwork,
	49:  OpNetwork,
	50:  OpNetwork,
	51:  OpNetwork,
	52:  OpNetwork,
	53:  OpNetwork,
	54:  OpNetwork,
	55:  OpExec,
	56:  OpExec,
	57:  OpExec,
	59:  OpExec,
	60:  OpProcess,
	62:  OpProcess,
	63:  OpProcess,
	64:  OpProcess,
	65:  OpProcess,
	66:  OpProcess,
	68:  OpProcess,
	69:  OpProcess,
	70:  OpProcess,
	71:  OpExec,
	72:  OpModify,
	80:  OpModify,
	81:  OpModify,
	82:  OpDelete,
	83:  OpDelete,
	84:  OpCreate,
	85:  OpCreate,
	86:  OpDelete,
	87:  OpDelete,
	88:  OpRead,
	89:  OpModify,
	90:  OpModify,
	91:  OpModify,
	92:  OpModify,
	93:  OpModify,
	94:  OpModify,
	95:  OpModify,
	96:  OpProcess,
	101: OpProcess,
	103: OpProcess,
	104: OpProcess,
	105: OpProcess,
	106: OpProcess,
	107: OpProcess,
	108: OpProcess,
	109: OpProcess,
	110: OpProcess,
	111: OpProcess,
	112: OpProcess,
	113: OpProcess,
	114: OpProcess,
	115: OpProcess,
	116: OpProcess,
	117: OpProcess,
	118: OpProcess,
	120: OpProcess,
	121: OpProcess,
	122: OpProcess,
	127: OpSignal,
	128: OpSignal,
	129: OpSignal,
	130: OpSignal,
	140: OpIPC,
	141: OpIPC,
	142: OpIPC,
	143: OpIPC,
	144: OpIPC,
	145: OpIPC,
	146: OpIPC,
	147: OpMemory,
	148: OpMemory,
	149: OpMemory,
	150: OpMemory,
	151: OpMount,
	152: OpMount,
	154: OpProcess,
	157: OpProcess,
	158: OpMount,
	159: OpMount,
	160: OpMount,
	161: OpMount,
	162: OpMount,
	163: OpMount,
	164: OpMount,
	165: OpMount,
	231: OpNetwork,
	233: OpProcess,
	234: OpMemory,
	235: OpMemory,
	257: OpExec,
	259: OpMemory,
}

// ParseSyscall extracts meaningful information from a seccomp notification
func ParseSyscall(n *Notification) (*ParsedSyscall, error) {
	syscallName := SyscallName(n.SyscallNum)
	operation := SyscallClassifier[n.SyscallNum]
	if operation == "" {
		operation = OpUnknown
	}

	parsed := &ParsedSyscall{
		SyscallNum:  n.SyscallNum,
		SyscallName: syscallName,
		Operation:   operation,
		PID:         n.PID,
		RawArgs:     n.Args,
		Args:        make([]string, 0),
	}

	// Extract target (file path, address, etc.) based on syscall
	parsed.Target = extractTarget(n.SyscallNum, n.Args)

	// Convert args to strings where possible
	for i, arg := range n.Args {
		parsed.Args = append(parsed.Args, fmt.Sprintf("0x%x", arg))
		if i >= 5 {
			break
		}
	}

	return parsed, nil
}

// extractTarget extracts the target (file path, address, etc.) from syscall args
func extractTarget(syscallNum uint32, args [6]uint64) string {
	switch syscallNum {
	case 2: // open
		return readStringFromMemory(args[0])
	case 3: // close
		return fmt.Sprintf("fd=%d", args[0])
	case 9: // mmap
		return fmt.Sprintf("addr=0x%x, len=%d", args[1], args[2])
	case 10: // mprotect
		return fmt.Sprintf("addr=0x%x, len=%d", args[0], args[1])
	case 21: // readv
		return fmt.Sprintf("fd=%d", args[0])
	case 22: // writev
		return fmt.Sprintf("fd=%d", args[0])
	case 39: // socket
		return fmt.Sprintf("domain=%d, type=%d, protocol=%d", args[0], args[1], args[2])
	case 40: // connect
		return parseSocketAddr(args[1])
	case 41: // accept
		return fmt.Sprintf("sockfd=%d", args[0])
	case 42: // connect (sendto)
		return parseSocketAddr(args[1])
	case 48: // listen
		return fmt.Sprintf("sockfd=%d, backlog=%d", args[0], args[1])
	case 49: // getsockname
		return fmt.Sprintf("sockfd=%d", args[0])
	case 50: // getpeername
		return fmt.Sprintf("sockfd=%d", args[0])
	case 55: // clone
		return fmt.Sprintf("flags=0x%x", args[0])
	case 56: // fork
		return ""
	case 57: // vfork
		return ""
	case 59: // execve
		// Try to read the command path from memory
		return readExecPathFromMemory(args[0], args[1])
	case 80: // chdir
		return readStringFromMemory(args[0])
	case 81: // fchdir
		return fmt.Sprintf("fd=%d", args[0])
	case 82: // mkdir
		return readStringFromMemory(args[0])
	case 83: // rmdir
		return readStringFromMemory(args[0])
	case 84: // creat
		return readStringFromMemory(args[0])
	case 85: // link
		return readStringFromMemory(args[0]) + " -> " + readStringFromMemory(args[1])
	case 86: // unlink
		return readStringFromMemory(args[0])
	case 87: // symlink
		return readStringFromMemory(args[1])
	case 88: // readlink
		return readStringFromMemory(args[0])
	case 89: // chmod
		return readStringFromMemory(args[0])
	case 90: // fchmod
		return fmt.Sprintf("fd=%d", args[0])
	case 91: // chown
		return readStringFromMemory(args[0])
	case 92: // fchown
		return fmt.Sprintf("fd=%d", args[0])
	case 101: // setuid
		return fmt.Sprintf("uid=%d", args[0])
	case 104: // setgid
		return fmt.Sprintf("gid=%d", args[0])
	case 231: // sendmmsg
		return fmt.Sprintf("sockfd=%d", args[0])
	case 257: // execveat
		return readExecPathFromMemory(args[1], args[2])
	default:
		return fmt.Sprintf("arg0=0x%x, arg1=0x%x, arg2=0x%x", args[0], args[1], args[2])
	}
}

// readStringFromMemory attempts to read a null-terminated string from the given address
// Note: In a real implementation, this would need to read from the process's memory
// For now, we return a placeholder
func readStringFromMemory(addr uint64) string {
	if addr == 0 {
		return ""
	}
	// This is a placeholder - in production, we'd need to read from the process's memory
	// using ptrace or similar mechanism
	return fmt.Sprintf("<ptr:0x%x>", addr)
}

// readExecPathFromMemory attempts to read command path and args from memory
func readExecPathFromMemory(pathPtr uint64, argvPtr uint64) string {
	if pathPtr == 0 {
		return ""
	}
	path := readStringFromMemory(pathPtr)
	if path != "" && !strings.HasPrefix(path, "<ptr:") {
		return path
	}
	return fmt.Sprintf("<exec at 0x%x>", pathPtr)
}

// parseSocketAddr parses a socket address from the given address pointer
func parseSocketAddr(addr uint64) string {
	if addr == 0 {
		return ""
	}
	// Simplified parsing - would need to read sockaddr_in/sockaddr_in6 from memory
	return fmt.Sprintf("<sockaddr:0x%x>", addr)
}

// IsSensitiveSyscall checks if a syscall is considered sensitive
func IsSensitiveSyscall(syscallNum uint32) bool {
	sensitiveSyscalls := map[uint32]bool{
		2:   true, // open - file access
		9:   true, // mmap - memory mapping
		10:  true, // mprotect - memory protection
		39:  true, // socket - network socket
		40:  true, // connect - network connect
		41:  true, // accept - network accept
		42:  true, // connect - network connect
		54:  true, // setsockopt - socket options
		55:  true, // clone - process creation
		56:  true, // fork - process creation
		57:  true, // vfork - process creation
		59:  true, // execve - execution
		60:  true, // exit - process exit
		62:  true, // kill - signal
		101: true, // setuid - privilege change
		104: true, // setgid - privilege change
		105: true, // setreuid - privilege change
		106: true, // setregid - privilege change
		115: true, // setresuid - privilege change
		117: true, // setresgid - privilege change
		120: true, // setfsuid - privilege change
		121: true, // setfsgid - privilege change
		154: true, // prctl - process control
		157: true, // chroot - change root
		159: true, // sync - filesystem sync
		160: true, // mount - mount filesystem
		161: true, // umount - unmount filesystem
		162: true, // swapon - swap on
		163: true, // swapoff - swap off
		164: true, // reboot - reboot
		165: true, // setdomainname - set domain name
		167: true, // iopl - I/O privilege level
		168: true, // ioperm - I/O permission
		169: true, // init_module - load kernel module
		170: true, // delete_module - unload kernel module
		231: true, // sendmmsg - send messages
		257: true, // execveat - execution
		259: true, // userfaultfd - userfaultfd
	}
	return sensitiveSyscalls[syscallNum]
}

// ParseToAction converts a parsed syscall to a policy action string
func (p *ParsedSyscall) ParseToAction() string {
	var buf bytes.Buffer
	buf.WriteString(string(p.Operation))
	buf.WriteString(":")
	buf.WriteString(p.SyscallName)

	// Add target info if available
	if p.Target != "" && !strings.HasPrefix(p.Target, "<") {
		buf.WriteString(":")
		// Extract just the filename or last component
		buf.WriteString(path.Base(p.Target))
	}

	return buf.String()
}
