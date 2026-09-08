use std::ffi::OsStr;
use std::process::Command;

/// Creates a `std::process::Command` configured to execute without showing
/// a flashing console/cmd window on Windows (using CREATE_NO_WINDOW flag).
pub fn silent_command<S: AsRef<OsStr>>(program: S) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}
