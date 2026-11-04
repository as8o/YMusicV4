; Inno Setup script for YMusic, compiled as-is by the Gradle task `packageReleaseInnoSetup`, which
; passes the version, paths and arch as ISCC /D defines.
;
; Build input (jpackage's `createReleaseDistributable` output):
;   AppSourceDir = desktopApp/build/compose/binaries/main-release/app/YM
;     containing YM.exe + runtime/ + app/
;
; Output:
;   OutputDir/OutputBaseFilename.exe (self-contained installer, LZMA2)

#define AppName "YM"
#define AppExeName "YM.exe"
; Separate YM AppId from upstream YMusic, stable across all future YM upgrades.
#define AppId "{{C06DE08F-4DB1-4C81-A6B5-6D1A8F57B33B}"

[Setup]
AppId={#AppId}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
; auto = show the chooser on fresh install (user picks where to go), hide it on upgrade
; (same path as the detected previous install — swapping it mid-upgrade breaks tracking).
DisableProgramGroupPage=auto
DisableDirPage=auto
AllowNoIcons=yes
OutputDir={#OutputDir}
OutputBaseFilename={#OutputBaseName}
SetupIconFile={#IconFile}
UninstallDisplayIcon={app}\{#AppExeName}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
; Per-machine install into Program Files, requires UAC — same as the previous MSI. Switch to
; `lowest` and `DefaultDirName={localappdata}\Programs\{#AppName}` for a Chrome-style per-user
; install that skips the elevation prompt.
PrivilegesRequired=admin
; Arch: x64compatible, or arm64 for the native Windows on ARM build.
ArchitecturesAllowed={#Arch}
ArchitecturesInstallIn64BitMode={#Arch}
MinVersion=10.0
CloseApplications=force
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

; An upgrade replaces the app image wholesale: jars and DLLs the new version dropped must not linger.
[InstallDelete]
Type: filesandordirs; Name: "{app}\app"
Type: filesandordirs; Name: "{app}\runtime"

[Files]
Source: "{#AppSourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
