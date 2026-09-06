pub mod linux;
pub mod windows;

pub use linux::LinuxTweaks;
pub use windows::WindowsTweaks;

pub fn detect_system_dns() -> crate::models::DnsInfo {
    #[cfg(target_os = "windows")]
    {
        WindowsTweaks::detect_dns()
    }
    #[cfg(not(target_os = "windows"))]
    {
        LinuxTweaks::detect_dns()
    }
}

pub fn set_system_dns(preset: &str) -> Result<crate::models::TweakActionReport, String> {
    #[cfg(target_os = "windows")]
    {
        WindowsTweaks::set_dns(preset)
    }
    #[cfg(not(target_os = "windows"))]
    {
        LinuxTweaks::set_dns(preset)
    }
}
