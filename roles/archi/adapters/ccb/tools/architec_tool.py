from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import subprocess
import time


DEFAULT_NPM_PACKAGE = '@seemseam/archi'


def install_or_update(action: str) -> int:
    paths = _paths()
    paths['root'].mkdir(parents=True, exist_ok=True)
    npm = shutil.which('npm')
    if not npm:
        _print_status(
            {
                'architec_status': 'failed',
                'action': action,
                'reason': 'npm is not available',
                'npm_package': _npm_package(),
                'hint': 'Install Node.js/npm, then run ccb roles update agentroles.archi.',
            }
        )
        return 1

    package = _npm_package()
    result = _run([npm, 'install', '-g', package], timeout_s=_timeout_s())
    if result.returncode != 0:
        _print_status(
            {
                'architec_status': 'failed',
                'action': action,
                'reason': 'npm install failed',
                'npm': npm,
                'npm_package': package,
                'stderr': _one_line(result.stderr),
            }
        )
        return 1

    archi = shutil.which('archi')
    if not archi:
        _print_status(
            {
                'architec_status': 'failed',
                'action': action,
                'reason': 'archi binary not found after npm install',
                'npm': npm,
                'npm_package': package,
                'hint': 'Ensure the npm global bin directory is on PATH.',
            }
        )
        return 1

    version = _probe_version(archi)
    manifest = {
        'schema': 'ccb-tool-archi/v1',
        'status': 'ok',
        'action': action,
        'package_manager': 'npm',
        'npm': npm,
        'npm_package': package,
        'archi_binary': archi,
        'version': version,
        'legacy_ccb_archi': _legacy_ccb_archi(),
        'updated_at': int(time.time()),
    }
    paths['manifest'].write_text(json.dumps(manifest, sort_keys=True, indent=2) + '\n', encoding='utf-8')
    _print_status(
        {
            'architec_status': 'ok',
            'action': action,
            'package_manager': 'npm',
            'npm_package': package,
            'archi_binary': archi,
            'version': version,
            'manifest': str(paths['manifest']),
        }
    )
    return 0


def doctor() -> int:
    paths = _paths()
    npm = shutil.which('npm')
    archi = shutil.which('archi')
    legacy = _legacy_ccb_archi()
    help_status = 'skipped'
    version = ''
    if archi:
        help_result = _run([archi, '--help'], timeout_s=20)
        help_status = 'ok' if help_result.returncode == 0 else 'failed'
        version = _probe_version(archi)
    llmgateway = _llmgateway_config()
    status, reason = _doctor_status(
        archi=archi,
        help_status=help_status,
        llmgateway=llmgateway,
    )
    _print_status(
        {
            'architec_status': status,
            'reason': reason,
            'package_manager': 'npm',
            'npm': npm or '',
            'npm_package': _npm_package(),
            'path_archi': archi or '',
            'selected_binary': archi or '',
            'selected_kind': 'path_archi' if archi else 'none',
            'help_status': help_status,
            'version': version,
            'package_bundle': 'present' if archi and help_status == 'ok' else 'missing',
            'hippo_bundle': 'bundled_with_archi_package' if archi and help_status == 'ok' else 'unknown',
            'llmgateway_bundle': 'bundled_with_archi_package' if archi and help_status == 'ok' else 'unknown',
            'llmgateway_config': 'present' if llmgateway else 'missing',
            'llmgateway_config_path': str(llmgateway or ''),
            'llmgateway_hint': _llmgateway_hint() if not llmgateway else '',
            'llm_readiness': 'ok' if llmgateway else 'degraded',
            'legacy_ccb_archi': legacy,
            'legacy_ccb_archi_note': _legacy_note(legacy),
            'route_check': 'not_run',
            'route_check_command': 'archi --check .',
            'manifest': str(paths['manifest']),
        }
    )
    return 0 if status in {'ok', 'degraded'} else 1


def _paths() -> dict[str, Path]:
    data_home = Path(os.environ.get('XDG_DATA_HOME') or Path.home() / '.local' / 'share').expanduser()
    return {
        'root': data_home / 'ccb' / 'tools' / 'archi',
        'manifest': data_home / 'ccb' / 'tools' / 'archi' / 'manifest.json',
    }


def _npm_package() -> str:
    return str(os.environ.get('CCB_ARCHI_NPM_PACKAGE') or DEFAULT_NPM_PACKAGE).strip() or DEFAULT_NPM_PACKAGE


def _legacy_ccb_archi() -> str:
    return shutil.which('ccb-archi') or ''


def _legacy_note(legacy: str) -> str:
    if not legacy:
        return ''
    return 'legacy ccb-archi wrapper detected and ignored; CCB now prefers the npm archi CLI'


def _probe_version(binary: str) -> str:
    for args in ([binary, '--version'], [binary, 'version']):
        result = _run(list(args), timeout_s=20)
        if result.returncode == 0 and result.stdout.strip():
            return _one_line(result.stdout)
    return ''


def _llmgateway_config() -> Path | None:
    for name in ('LLMGATEWAY_CONFIG', 'LLM_GATEWAY_CONFIG'):
        raw = os.environ.get(name)
        if raw and Path(raw).expanduser().is_file():
            return Path(raw).expanduser()
    candidates = [
        Path.home() / '.llmgateway' / 'config.toml',
        Path.home() / '.llmgateway' / 'config.yaml',
        Path.home() / '.llmgateway' / 'config.yml',
        Path.home() / '.config' / 'llmgateway' / 'config.toml',
        Path.home() / '.config' / 'llmgateway' / 'config.yaml',
        Path.home() / '.config' / 'llmgateway' / 'config.yml',
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return None


def _llmgateway_hint() -> str:
    return (
        'Set LLMGATEWAY_CONFIG or LLM_GATEWAY_CONFIG, or create one of: '
        '~/.llmgateway/config.yaml, ~/.llmgateway/config.toml, '
        '~/.config/llmgateway/config.yaml, ~/.config/llmgateway/config.toml'
    )


def _doctor_status(
    *,
    archi: str | None,
    help_status: str,
    llmgateway: Path | None,
) -> tuple[str, str]:
    if not archi:
        return ('missing', 'archi CLI is not available; install npm package @seemseam/archi')
    if help_status != 'ok':
        return ('failed', 'archi CLI does not pass --help')
    if not llmgateway:
        return ('degraded', 'llmgateway config is missing; Archi LLM analysis is not ready')
    return ('ok', 'npm archi CLI and llmgateway config are present')


def _run(args: list[str], *, timeout_s: float) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            args,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout_s,
            check=False,
        )
    except Exception as exc:
        return subprocess.CompletedProcess(args, 1, '', f'{type(exc).__name__}: {exc}')


def _timeout_s() -> float:
    try:
        return float(os.environ.get('CCB_ARCHI_INSTALL_TIMEOUT_S') or '900')
    except ValueError:
        return 900.0


def _one_line(text: str) -> str:
    return ' | '.join(line.strip() for line in str(text or '').splitlines() if line.strip())


def _print_status(payload: dict[str, object]) -> None:
    for key, value in payload.items():
        print(f'{key}: {value}')
