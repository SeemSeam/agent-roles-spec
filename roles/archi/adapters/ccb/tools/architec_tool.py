from __future__ import annotations

import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import time


DEFAULT_INSTALL_SPEC = 'architec @ git+https://github.com/SeemSeam/architec.git'


def install_or_update(action: str) -> int:
    paths = _paths()
    paths['root'].mkdir(parents=True, exist_ok=True)
    paths['bin_dir'].mkdir(parents=True, exist_ok=True)
    paths['bin_link'].parent.mkdir(parents=True, exist_ok=True)
    try:
        _ensure_venv(paths)
    except Exception as exc:
        _print_status(
            {
                'architec_status': 'failed',
                'action': action,
                'reason': 'managed venv is not installable',
                'venv': str(paths['venv']),
                'stderr': f'{type(exc).__name__}: {exc}',
            }
        )
        return 1
    install_spec = os.environ.get('CCB_ARCHITEC_INSTALL_SPEC') or DEFAULT_INSTALL_SPEC
    pip_result = _run(
        [
            str(paths['venv_python']),
            '-m',
            'pip',
            'install',
            '--upgrade',
            install_spec,
        ],
        timeout_s=_timeout_s(),
    )
    if pip_result.returncode != 0:
        _print_status(
            {
                'architec_status': 'failed',
                'action': action,
                'reason': 'pip install failed',
                'venv': str(paths['venv']),
                'stderr': _one_line(pip_result.stderr),
            }
        )
        return 1
    _write_wrapper(paths)
    _write_bin_link(paths)
    version = _probe_version(paths)
    manifest = {
        'schema': 'ccb-tool-architec/v1',
        'status': 'ok',
        'action': action,
        'install_spec': install_spec,
        'venv': str(paths['venv']),
        'wrapper': str(paths['wrapper']),
        'bin_link': str(paths['bin_link']),
        'archi_binary': str(paths['archi_binary']),
        'version': version,
        'updated_at': int(time.time()),
    }
    paths['manifest'].write_text(json.dumps(manifest, sort_keys=True, indent=2) + '\n', encoding='utf-8')
    _print_status(
        {
            'architec_status': 'ok',
            'action': action,
            'venv': str(paths['venv']),
            'wrapper': str(paths['wrapper']),
            'bin_link': str(paths['bin_link']),
            'version': version,
        }
    )
    return 0


def doctor() -> int:
    paths = _paths()
    wrapper_ok = _is_executable(paths['wrapper'])
    managed_binary_ok = _is_executable(paths['archi_binary'])
    path_wrapper = shutil.which('ccb-archi')
    path_archi = shutil.which('archi')
    selected = str(paths['wrapper']) if wrapper_ok else (path_wrapper or path_archi)
    selected_kind = _selected_kind(
        selected,
        managed_wrapper=paths['wrapper'],
        path_wrapper=path_wrapper,
        path_archi=path_archi,
    )
    help_status = 'skipped'
    if selected:
        result = _run([selected, '--help'], timeout_s=20)
        help_status = 'ok' if result.returncode == 0 else 'failed'
    llmgateway = _llmgateway_config()
    status, reason = _doctor_status(
        selected=selected,
        help_status=help_status,
        llmgateway=llmgateway,
        wrapper_ok=wrapper_ok,
        managed_binary_ok=managed_binary_ok,
    )
    _print_status(
        {
            'architec_status': status,
            'reason': reason,
            'managed_wrapper': str(paths['wrapper']),
            'managed_wrapper_exists': wrapper_ok,
            'managed_archi_binary_exists': managed_binary_ok,
            'path_ccb_archi': path_wrapper or '',
            'path_archi': path_archi or '',
            'selected_binary': selected or '',
            'selected_kind': selected_kind,
            'help_status': help_status,
            'llmgateway_config': 'present' if llmgateway else 'missing',
            'llmgateway_config_path': str(llmgateway or ''),
            'llmgateway_hint': _llmgateway_hint() if not llmgateway else '',
            'llm_readiness': 'ok' if llmgateway else 'degraded',
            'route_check': 'not_run',
            'route_check_command': 'ccb-archi --check . || archi --check .',
            'venv': str(paths['venv']),
            'manifest': str(paths['manifest']),
        }
    )
    return 0 if status in {'ok', 'degraded'} else 1


def _paths() -> dict[str, Path]:
    data_home = Path(os.environ.get('XDG_DATA_HOME') or Path.home() / '.local' / 'share').expanduser()
    root = data_home / 'ccb' / 'tools' / 'architec'
    venv = root / 'venv'
    venv_bin = venv / ('Scripts' if os.name == 'nt' else 'bin')
    wrapper_name = 'ccb-archi.cmd' if os.name == 'nt' else 'ccb-archi'
    archi_name = 'archi.exe' if os.name == 'nt' else 'archi'
    bin_home = Path(os.environ.get('CODEX_BIN_DIR') or Path.home() / '.local' / 'bin').expanduser()
    return {
        'root': root,
        'bin_dir': root / 'bin',
        'venv': venv,
        'venv_python': venv_bin / ('python.exe' if os.name == 'nt' else 'python'),
        'archi_binary': venv_bin / archi_name,
        'wrapper': root / 'bin' / wrapper_name,
        'bin_link': bin_home / wrapper_name,
        'manifest': root / 'manifest.json',
    }


def _ensure_venv(paths: dict[str, Path]) -> None:
    if not _is_executable(paths['venv_python']):
        _create_venv(paths, clear=False)
    if _pip_available(paths):
        return
    _run([str(paths['venv_python']), '-m', 'ensurepip', '--upgrade'], timeout_s=120)
    if _pip_available(paths):
        return
    _create_venv(paths, clear=True)
    if _pip_available(paths):
        return
    raise RuntimeError('pip unavailable in managed Architec venv after ensurepip/rebuild')


def _create_venv(paths: dict[str, Path], *, clear: bool) -> None:
    args = [sys.executable, '-m', 'venv']
    if clear:
        args.append('--clear')
    args.append(str(paths['venv']))
    result = _run(args, timeout_s=120)
    if result.returncode != 0:
        action = 'rebuild' if clear else 'create'
        raise RuntimeError(f'failed to {action} managed Architec venv: {_one_line(result.stderr)}')


def _pip_available(paths: dict[str, Path]) -> bool:
    if not _is_executable(paths['venv_python']):
        return False
    result = _run([str(paths['venv_python']), '-m', 'pip', '--version'], timeout_s=60)
    return result.returncode == 0


def _write_wrapper(paths: dict[str, Path]) -> None:
    wrapper = paths['wrapper']
    if os.name == 'nt':
        wrapper.write_text(f'@echo off\r\n"{paths["archi_binary"]}" %*\r\n', encoding='utf-8')
    else:
        wrapper.write_text(
            '#!/usr/bin/env sh\n'
            f'exec {shlex.quote(str(paths["archi_binary"]))} "$@"\n',
            encoding='utf-8',
        )
        wrapper.chmod(0o755)


def _write_bin_link(paths: dict[str, Path]) -> None:
    source = paths['wrapper']
    target = paths['bin_link']
    if source.resolve() == target.resolve():
        return
    if target.exists() or target.is_symlink():
        target.unlink()
    try:
        target.symlink_to(source)
    except OSError:
        shutil.copy2(source, target)
        if os.name != 'nt':
            target.chmod(0o755)


def _probe_version(paths: dict[str, Path]) -> str:
    if not _is_executable(paths['wrapper']):
        return ''
    for args in ([str(paths['wrapper']), '--version'], [str(paths['wrapper']), 'version']):
        result = _run(args, timeout_s=20)
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


def _selected_kind(
    selected: str | None,
    *,
    managed_wrapper: Path,
    path_wrapper: str | None,
    path_archi: str | None,
) -> str:
    if not selected:
        return 'none'
    try:
        selected_path = Path(selected).expanduser().resolve()
        if selected_path == managed_wrapper.expanduser().resolve():
            return 'managed_wrapper'
        if path_wrapper and selected_path == Path(path_wrapper).expanduser().resolve():
            return 'path_ccb_archi'
        if path_archi and selected_path == Path(path_archi).expanduser().resolve():
            return 'path_archi'
    except OSError:
        pass
    return 'unknown'


def _doctor_status(
    *,
    selected: str | None,
    help_status: str,
    llmgateway: Path | None,
    wrapper_ok: bool,
    managed_binary_ok: bool,
) -> tuple[str, str]:
    if not selected:
        return ('missing', 'neither ccb-archi nor archi is available')
    if help_status != 'ok':
        return ('failed', 'selected Architec binary does not pass --help')
    if not llmgateway:
        return ('degraded', 'llmgateway config is missing; Architec LLM analysis is not ready')
    if not wrapper_ok or not managed_binary_ok:
        return ('degraded', 'CCB-managed ccb-archi wrapper is missing; using fallback Architec binary')
    return ('ok', 'managed Architec wrapper and llmgateway config are present')


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
        return float(os.environ.get('CCB_ARCHITEC_INSTALL_TIMEOUT_S') or '900')
    except ValueError:
        return 900.0


def _is_executable(path: Path) -> bool:
    return path.is_file() and (os.name == 'nt' or os.access(path, os.X_OK))


def _one_line(text: str) -> str:
    return ' | '.join(line.strip() for line in str(text or '').splitlines() if line.strip())


def _print_status(payload: dict[str, object]) -> None:
    for key, value in payload.items():
        print(f'{key}: {value}')
