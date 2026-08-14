import datetime
import os
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import config
from utils import format_size, log, validate_path


class FilesystemAgent:
    """Agent for safe file and directory operations within allowed filesystem roots."""

    def __init__(self) -> None:
        pass

    def _verify_permission(self, override: bool = False) -> None:
        """Check if filesystem permission is enabled."""
        if not override and not config.PERMISSIONS.get("filesystem", False):
            raise PermissionError("Filesystem action blocked: 'filesystem' permission is not enabled.")

    def create_file(
        self,
        path: str,
        content: str = "",
        encoding: str = "utf-8",
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Create file at path with given content (or empty file)."""
        self._verify_permission(permission_granted)
        target = validate_path(path)

        if target.exists():
            raise FileExistsError(f"File already exists: {target}")

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding=encoding)

        return {
            "status": "success",
            "action": "create_file",
            "path": str(target),
            "size": len(content.encode(encoding)),
        }

    def read_file(
        self,
        path: str,
        encoding: str = "utf-8",
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Read text content of file at path."""
        self._verify_permission(permission_granted)
        target = validate_path(path)

        if not target.exists():
            raise FileNotFoundError(f"File not found: {target}")

        if target.is_dir():
            raise IsADirectoryError(f"Path is a directory, not a file: {target}")

        content = target.read_text(encoding=encoding, errors="replace")
        stat = target.stat()

        return {
            "status": "success",
            "action": "read_file",
            "path": str(target),
            "content": content,
            "size": stat.st_size,
            "human_size": format_size(stat.st_size),
        }

    def write_file(
        self,
        path: str,
        content: str,
        encoding: str = "utf-8",
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Write/overwrite content to file at path."""
        self._verify_permission(permission_granted)
        target = validate_path(path)

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding=encoding)
        stat = target.stat()

        return {
            "status": "success",
            "action": "write_file",
            "path": str(target),
            "size": stat.st_size,
            "human_size": format_size(stat.st_size),
        }

    def rename_file(
        self,
        old_path: str,
        new_path: str,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Rename file or directory from old_path to new_path."""
        self._verify_permission(permission_granted)
        src = validate_path(old_path)
        dst = validate_path(new_path)

        if not src.exists():
            raise FileNotFoundError(f"Source path not found: {src}")

        if dst.exists():
            raise FileExistsError(f"Target destination already exists: {dst}")

        src.rename(dst)

        return {
            "status": "success",
            "action": "rename_file",
            "old_path": str(src),
            "new_path": str(dst),
        }

    def move_file(
        self,
        source: str,
        destination: str,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Move file or directory from source to destination."""
        self._verify_permission(permission_granted)
        src = validate_path(source)
        dst = validate_path(destination)

        if not src.exists():
            raise FileNotFoundError(f"Source path not found: {src}")

        res_path = shutil.move(str(src), str(dst))

        return {
            "status": "success",
            "action": "move_file",
            "source": str(src),
            "destination": str(res_path),
        }

    def copy_file(
        self,
        source: str,
        destination: str,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Copy file or folder from source to destination."""
        self._verify_permission(permission_granted)
        src = validate_path(source)
        dst = validate_path(destination)

        if not src.exists():
            raise FileNotFoundError(f"Source path not found: {src}")

        if src.is_dir():
            res_path = shutil.copytree(str(src), str(dst), dirs_exist_ok=True)
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            res_path = shutil.copy2(str(src), str(dst))

        return {
            "status": "success",
            "action": "copy_file",
            "source": str(src),
            "destination": str(res_path),
        }

    def delete_file(
        self,
        path: str,
        confirmed: bool = False,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """
        Delete file or directory.
        Requires explicit confirmed=True flag for safety!
        """
        self._verify_permission(permission_granted)
        if not confirmed:
            raise ValueError(
                "Deletion operation rejected: safety parameter 'confirmed=True' is required."
            )

        target = validate_path(path)

        if not target.exists():
            raise FileNotFoundError(f"Path not found: {target}")

        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()

        return {
            "status": "success",
            "action": "delete_file",
            "deleted_path": str(target),
            "confirmed": True,
        }

    def create_folder(
        self,
        path: str,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Create directory and parent directories (mkdir -p style)."""
        self._verify_permission(permission_granted)
        target = validate_path(path)

        target.mkdir(parents=True, exist_ok=True)

        return {
            "status": "success",
            "action": "create_folder",
            "path": str(target),
        }

    def list_directory(
        self,
        path: str,
        permission_granted: bool = False,
    ) -> List[Dict[str, Any]]:
        """List files and subdirectories inside given directory path."""
        self._verify_permission(permission_granted)
        target = validate_path(path)

        if not target.exists():
            raise FileNotFoundError(f"Directory not found: {target}")

        if not target.is_dir():
            raise NotADirectoryError(f"Path is not a directory: {target}")

        items: List[Dict[str, Any]] = []
        for entry in target.iterdir():
            try:
                stat = entry.stat()
                items.append({
                    "name": entry.name,
                    "path": str(entry),
                    "is_dir": entry.is_dir(),
                    "is_file": entry.is_file(),
                    "size": stat.st_size if entry.is_file() else 0,
                    "human_size": format_size(stat.st_size) if entry.is_file() else "0 B",
                    "modified_time": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(),
                })
            except Exception:
                continue

        return items

    def file_exists(self, path: str) -> bool:
        """Check whether path exists inside allowed file roots."""
        try:
            target = validate_path(path)
            return target.exists()
        except Exception:
            return False

    def get_file_info(self, path: str) -> Dict[str, Any]:
        """Return detailed metadata for file or directory."""
        target = validate_path(path)

        if not target.exists():
            raise FileNotFoundError(f"Path not found: {target}")

        stat = target.stat()
        return {
            "name": target.name,
            "path": str(target),
            "is_dir": target.is_dir(),
            "is_file": target.is_file(),
            "extension": target.suffix,
            "size": stat.st_size if target.is_file() else 0,
            "human_size": format_size(stat.st_size) if target.is_file() else "0 B",
            "created_time": datetime.datetime.fromtimestamp(stat.st_ctime).isoformat(),
            "modified_time": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(),
        }

    def search_files(
        self,
        directory: str,
        pattern: str = "*",
        recursive: bool = True,
        permission_granted: bool = False,
    ) -> List[Dict[str, Any]]:
        """Search for files matching glob pattern inside directory."""
        self._verify_permission(permission_granted)
        target = validate_path(directory)

        if not target.exists() or not target.is_dir():
            raise NotADirectoryError(f"Invalid directory path: {target}")

        results: List[Dict[str, Any]] = []
        gen = target.rglob(pattern) if recursive else target.glob(pattern)

        for match in gen:
            try:
                stat = match.stat()
                results.append({
                    "name": match.name,
                    "path": str(match),
                    "is_dir": match.is_dir(),
                    "is_file": match.is_file(),
                    "size": stat.st_size if match.is_file() else 0,
                    "human_size": format_size(stat.st_size) if match.is_file() else "0 B",
                })
            except Exception:
                continue

        return results
