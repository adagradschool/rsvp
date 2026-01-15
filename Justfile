set shell := ["zsh", "-cu"]

PORT := env_var_or_default("PORT", "5173")

start:
	@PORT={{PORT}} ./rsvp-start.sh

stop:
	@PORT={{PORT}} ./rsvp-stop.sh

install-login:
	@mkdir -p "$HOME/Library/LaunchAgents"
	@cat <<-'PLIST' > "$HOME/Library/LaunchAgents/com.rsvp.reader.plist"
	<?xml version="1.0" encoding="UTF-8"?>
	<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
	<plist version="1.0">
	<dict>
	<key>Label</key>
	<string>com.rsvp.reader</string>
	<key>ProgramArguments</key>
	<array>
	<string>/bin/zsh</string>
	<string>-lc</string>
	<string>cd {{justfile_directory()}} && /usr/bin/env bash rsvp-start.sh</string>
	</array>
	<key>EnvironmentVariables</key>
	<dict>
	<key>PORT</key>
	<string>{{PORT}}</string>
	</dict>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<true/>
	<key>StandardOutPath</key>
	<string>{{justfile_directory()}}/rsvp.out.log</string>
	<key>StandardErrorPath</key>
	<string>{{justfile_directory()}}/rsvp.err.log</string>
	<key>WorkingDirectory</key>
	<string>{{justfile_directory()}}</string>
	</dict>
	</plist>
	PLIST
	@launchctl unload "$HOME/Library/LaunchAgents/com.rsvp.reader.plist" >/dev/null 2>&1 || true
	@launchctl load "$HOME/Library/LaunchAgents/com.rsvp.reader.plist"
	@echo "Installed login item: com.rsvp.reader"

uninstall-login:
	@launchctl unload "$HOME/Library/LaunchAgents/com.rsvp.reader.plist" >/dev/null 2>&1 || true
	@rm -f "$HOME/Library/LaunchAgents/com.rsvp.reader.plist"
	@echo "Removed login item: com.rsvp.reader"
