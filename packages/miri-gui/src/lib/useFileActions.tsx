import React, { MouseEvent, useState } from "react";
import { FolderOpen, Info, Trash2 } from "lucide-react";
import { useCleanerStore } from "../store/useCleanerStore";
import { bridge } from "./bridge";
import { ContextMenuItem } from "../components/ui/ContextMenu";

export interface FileContextMenuState {
  x: number;
  y: number;
  path: string;
  name: string;
  isDir: boolean;
}

/** Shared right-click (and keyboard-equivalent) "Show in File Explorer /
 * Properties / Delete" behavior for any list of real filesystem paths
 * (Storage & Duplicates' heavyweight files and largest folders, the Big
 * File Finder, ...). Delete always goes through the app's existing
 * type-to-confirm danger modal and moves the item to the OS trash, never a
 * permanent unlink; the modal itself now awaits and surfaces the delete's
 * own failure, so it isn't duplicated here. */
export function useFileActions(reload: () => void | Promise<void>) {
  const { addLog, openDangerModal } = useCleanerStore();
  const [contextMenu, setContextMenu] = useState<FileContextMenuState | null>(null);
  const [propertiesPath, setPropertiesPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openContextMenu = (e: MouseEvent, path: string, name: string, isDir: boolean) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path, name, isDir });
  };

  /** Keyboard-reachable equivalent of right-click: anchors the same menu to
   * a focusable trigger element (a row's "More actions" button) instead of
   * requiring a mouse. */
  const openContextMenuAt = (target: HTMLElement, path: string, name: string, isDir: boolean) => {
    const rect = target.getBoundingClientRect();
    setContextMenu({ x: rect.left, y: rect.bottom + 4, path, name, isDir });
  };

  const closeContextMenu = () => setContextMenu(null);
  const dismissError = () => setError(null);

  const reveal = async (path: string) => {
    try {
      await bridge.revealInFileManager(path);
    } catch (e) {
      const message = `Failed to open file manager: ${e instanceof Error ? e.message : String(e)}`;
      addLog(message);
      setError(message);
    }
  };

  const requestDelete = (path: string, name: string, isDir: boolean) => {
    openDangerModal({
      title: `Delete "${name}"?`,
      description: `This moves ${
        isDir ? "this folder" : "this file"
      } to the recycle bin. Nothing is destroyed permanently -- you can restore it from there if this was a mistake.`,
      requiresElevation: false,
      riskLevel: "moderate",
      confirmWord: "DELETE",
      // Deliberately no try/catch: the danger modal now awaits onConfirm and
      // shows a thrown error inline itself, so a failed delete stays
      // visible right where the user is looking instead of only in the log.
      onConfirm: async () => {
        const res = await bridge.deletePath(path);
        addLog(res.details);
        await reload();
      },
    });
  };

  /** The three standard menu items for whatever path the context menu is
   * currently open for, or null when it's closed. Centralized here so every
   * consumer renders the same three actions instead of redefining them. */
  const buildMenuItems = (): ContextMenuItem[] | null => {
    if (!contextMenu) return null;
    const { path, name, isDir } = contextMenu;
    return [
      {
        label: "Show in File Explorer",
        icon: <FolderOpen className="w-3.5 h-3.5" />,
        onClick: () => reveal(path),
      },
      {
        label: "Properties",
        icon: <Info className="w-3.5 h-3.5" />,
        onClick: () => setPropertiesPath(path),
      },
      {
        label: "Delete",
        icon: <Trash2 className="w-3.5 h-3.5" />,
        danger: true,
        onClick: () => requestDelete(path, name, isDir),
      },
    ];
  };

  return {
    contextMenu,
    propertiesPath,
    setPropertiesPath,
    openContextMenu,
    openContextMenuAt,
    closeContextMenu,
    reveal,
    requestDelete,
    buildMenuItems,
    error,
    dismissError,
  };
}
