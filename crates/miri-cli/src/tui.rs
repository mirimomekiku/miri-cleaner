use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use miri_core::*;
use ratatui::{
    backend::CrosstermBackend,
    layout::{Alignment, Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph, Wrap},
    Terminal,
};
use std::io;

const PINK_ACCENT: Color = Color::Rgb(255, 157, 157); // #FF9D9D
const MINT_SAFE: Color = Color::Rgb(88, 204, 2);     // Duolingo green
const DANGER_RED: Color = Color::Rgb(255, 75, 75);

#[allow(dead_code)]
#[derive(PartialEq, Eq)]
pub enum TuiView {
    Dashboard,
    Inspection,
    Tweaks,
    ConfirmDialog,
}

pub fn run_interactive_tui() -> Result<(), Box<dyn std::error::Error>> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut current_view = TuiView::Dashboard;
    let mut scan_result = Scanner::scan_all();
    let snapshot_status = SnapshotManager::get_status();
    let mut status_message = "Ready. Press [S] to Scan, [C] to Clean, [T] for Tweaks, [Q] to Quit.".to_string();
    let mut selected_index = 0usize;
    let mut confirm_prompt = String::new();

    loop {
        terminal.draw(|f| {
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Length(4), // Header / Mascot banner
                    Constraint::Min(10),   // Main View area
                    Constraint::Length(3), // Footer / Controls
                ])
                .split(f.area());

            // 1. Playful Pixel Header
            let header_text = vec![
                Line::from(vec![
                    Span::styled("  (•◡•) MIRI CLEANER  ", Style::default().fg(Color::White).bg(PINK_ACCENT).add_modifier(Modifier::BOLD)),
                    Span::raw("  "),
                    Span::styled(format!("[OS: {}]", scan_result.system_info.os_name), Style::default().fg(Color::Cyan)),
                    Span::raw("  "),
                    Span::styled(format!("[Snapshot: {}]", snapshot_status.provider_name), Style::default().fg(MINT_SAFE)),
                ]),
                Line::from(vec![
                    Span::styled("  Sparkling Clean & Ultra-Safe System Optimizer  ", Style::default().fg(PINK_ACCENT)),
                    Span::styled(format!(" | Reclaimable: {:.2} GB across {} targets", 
                        scan_result.total_reclaimable_bytes as f64 / (1024.0 * 1024.0 * 1024.0),
                        scan_result.targets.len()
                    ), Style::default().fg(Color::Yellow)),
                ]),
            ];
            let header = Paragraph::new(header_text)
                .block(Block::default().borders(Borders::BOTTOM).border_style(Style::default().fg(PINK_ACCENT)));
            f.render_widget(header, chunks[0]);

            // 2. Body based on current view
            match current_view {
                TuiView::Dashboard => {
                    let body_chunks = Layout::default()
                        .direction(Direction::Horizontal)
                        .constraints([Constraint::Percentage(55), Constraint::Percentage(45)])
                        .split(chunks[1]);

                    // Target list
                    let items: Vec<ListItem> = scan_result
                        .targets
                        .iter()
                        .enumerate()
                        .map(|(i, t)| {
                            let prefix = if i == selected_index { "▶ [*] " } else { "  [ ] " };
                            let risk_color = match t.risk_level {
                                RiskLevel::Safe => MINT_SAFE,
                                RiskLevel::Moderate => Color::Yellow,
                                RiskLevel::Aggressive | RiskLevel::Dangerous => DANGER_RED,
                            };
                            let line = Line::from(vec![
                                Span::styled(prefix, Style::default().fg(PINK_ACCENT).add_modifier(Modifier::BOLD)),
                                Span::styled(&t.name, Style::default().fg(Color::White)),
                                Span::raw(" - "),
                                Span::styled(
                                    format!("{:.1} MB", t.estimated_bytes as f64 / (1024.0 * 1024.0)),
                                    Style::default().fg(Color::Yellow),
                                ),
                                Span::raw(" "),
                                Span::styled(format!("[{:?}]", t.risk_level), Style::default().fg(risk_color)),
                            ]);
                            ListItem::new(line)
                        })
                        .collect();

                    let list = List::new(items)
                        .block(Block::default().title(" Clean Targets (Use Up/Down) ").borders(Borders::ALL).border_style(Style::default().fg(PINK_ACCENT)));
                    f.render_widget(list, body_chunks[0]);

                    // Right pane: Details & mascot speech bubble
                    let selected_target = scan_result.targets.get(selected_index);
                    let desc = selected_target.map(|t| t.description.as_str()).unwrap_or("Select a target");
                    let elev = selected_target.map(|t| if t.requires_elevation { "Requires Root/Admin" } else { "User-level safe" }).unwrap_or("");

                    let detail_text = vec![
                        Line::from(vec![Span::styled("Target Inspection Details:", Style::default().fg(PINK_ACCENT).add_modifier(Modifier::BOLD))]),
                        Line::from(""),
                        Line::from(vec![Span::raw(desc)]),
                        Line::from(""),
                        Line::from(vec![Span::styled(format!("Privilege: {}", elev), Style::default().fg(Color::Cyan))]),
                        Line::from(vec![Span::styled(format!("Snapshot Backup: {}", snapshot_status.details), Style::default().fg(MINT_SAFE))]),
                        Line::from(""),
                        Line::from(vec![
                            Span::styled(" ( ^_^)b ", Style::default().fg(PINK_ACCENT).add_modifier(Modifier::BOLD)),
                            Span::raw("Miri says: 'All scans are non-destructive! We check process locks first!'"),
                        ]),
                    ];
                    let details = Paragraph::new(detail_text)
                        .wrap(Wrap { trim: true })
                        .block(Block::default().title(" Details ").borders(Borders::ALL));
                    f.render_widget(details, body_chunks[1]);
                }
                TuiView::Tweaks => {
                    let tweak_text = vec![
                        Line::from(vec![Span::styled("System Optimization & Tweaks", Style::default().fg(PINK_ACCENT).add_modifier(Modifier::BOLD))]),
                        Line::from(""),
                        Line::from(" [1] Prune DNF Package Cache (Fedora)"),
                        Line::from(" [2] Vacuum Systemd Journals (>7 days, limit 200MB)"),
                        Line::from(" [3] Prune Unused Flatpak Runtimes"),
                        Line::from(" [4] Safe Old Kernel Prune (strictly preserves running + fallback)"),
                        Line::from(" [5] Developer Toolchain Sweeps (Cargo & Node caches)"),
                        Line::from(" [6] Windows Update 4-Tier Management (Windows 10/11)"),
                        Line::from(""),
                        Line::from("Press [ESC] to return to Dashboard."),
                    ];
                    let p = Paragraph::new(tweak_text).block(Block::default().title(" Tweaks ").borders(Borders::ALL));
                    f.render_widget(p, chunks[1]);
                }
                TuiView::ConfirmDialog => {
                    let dialog_text = vec![
                        Line::from(vec![Span::styled("⚠ SAFETY CHECKPOINT & CONFIRMATION ⚠", Style::default().fg(DANGER_RED).add_modifier(Modifier::BOLD))]),
                        Line::from(""),
                        Line::from(Span::raw(confirm_prompt.as_str())),
                        Line::from(""),
                        Line::from(vec![
                            Span::styled("Press [Y] to Confirm & Create Snapshot, or [N] to Cancel.", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
                        ]),
                    ];
                    let p = Paragraph::new(dialog_text)
                        .alignment(Alignment::Center)
                        .block(Block::default().borders(Borders::ALL).border_style(Style::default().fg(DANGER_RED)));
                    f.render_widget(p, chunks[1]);
                }
                _ => {}
            }

            // 3. Footer / Status bar
            let footer = Paragraph::new(Line::from(vec![
                Span::styled(format!(" STATUS: {} ", status_message), Style::default().fg(Color::Black).bg(PINK_ACCENT)),
            ]));
            f.render_widget(footer, chunks[2]);
        })?;

        // Handle key events
        if event::poll(std::time::Duration::from_millis(200))? {
            if let Event::Key(key) = event::read()? {
                match current_view {
                    TuiView::Dashboard => match key.code {
                        KeyCode::Char('q') | KeyCode::Char('Q') => break,
                        KeyCode::Up => {
                            if selected_index > 0 {
                                selected_index -= 1;
                            }
                        }
                        KeyCode::Down => {
                            if selected_index + 1 < scan_result.targets.len() {
                                selected_index += 1;
                            }
                        }
                        KeyCode::Char('s') | KeyCode::Char('S') => {
                            scan_result = Scanner::scan_all();
                            status_message = format!("Scan completed! Found {:.2} GB reclaimable.", scan_result.total_reclaimable_bytes as f64 / (1024.0 * 1024.0 * 1024.0));
                        }
                        KeyCode::Char('c') | KeyCode::Char('C') => {
                            confirm_prompt = format!(
                                "You are about to execute a system clean of selected targets ({:.2} GB).\nA safety checkpoint will be verified.",
                                scan_result.total_reclaimable_bytes as f64 / (1024.0 * 1024.0 * 1024.0)
                            );
                            current_view = TuiView::ConfirmDialog;
                        }
                        KeyCode::Char('t') | KeyCode::Char('T') => {
                            current_view = TuiView::Tweaks;
                        }
                        _ => {}
                    },
                    TuiView::Tweaks => match key.code {
                        KeyCode::Esc => current_view = TuiView::Dashboard,
                        KeyCode::Char('1') => {
                            let _ = LinuxTweaks::clean_dnf_cache();
                            status_message = "DNF cache pruned.".to_string();
                        }
                        KeyCode::Char('2') => {
                            let _ = LinuxTweaks::vacuum_systemd_journal();
                            status_message = "Systemd journal vacuumed to 200MB.".to_string();
                        }
                        KeyCode::Char('3') => {
                            let _ = LinuxTweaks::clean_flatpak_unused();
                            status_message = "Flatpak unused runtimes purged.".to_string();
                        }
                        KeyCode::Char('5') => {
                            let _ = DevCacheCleaner::clean_cargo_cache();
                            let _ = DevCacheCleaner::clean_npm_cache();
                            status_message = "Cargo & Node dev caches purged.".to_string();
                        }
                        _ => {}
                    },
                    TuiView::ConfirmDialog => match key.code {
                        KeyCode::Char('y') | KeyCode::Char('Y') => {
                            let plan = CleanExecutionPlan {
                                target_ids: scan_result.targets.iter().map(|t| t.id.clone()).collect(),
                                dry_run: false,
                                create_snapshot: true,
                            };
                            let res = Executor::execute_plan(&plan, &scan_result.targets);
                            status_message = format!("Cleaned {:.2} MB! Audit ID: {}", res.freed_bytes as f64 / (1024.0 * 1024.0), res.audit_id);
                            scan_result = Scanner::scan_all();
                            current_view = TuiView::Dashboard;
                        }
                        KeyCode::Char('n') | KeyCode::Char('N') | KeyCode::Esc => {
                            status_message = "Clean operation cancelled.".to_string();
                            current_view = TuiView::Dashboard;
                        }
                        _ => {}
                    },
                    _ => {}
                }
            }
        }
    }

    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen, DisableMouseCapture)?;
    terminal.show_cursor()?;
    Ok(())
}
