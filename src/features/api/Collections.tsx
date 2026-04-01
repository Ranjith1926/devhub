/**
 * Collections.tsx
 * Slide-in panel listing saved API collections and their requests.
 * Users can save the current request into a collection from here.
 */

import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  FolderOpen,
  Folder,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MethodBadge } from '../../components/ui/Badge';
import { useApiStore } from '../../store/apiStore';
import { useToast } from '../../hooks/useToast';
import { ApiCollection, SavedRequest } from '../../types';

export function Collections() {
  const toast = useToast();
  const {
    collections,
    setCollections,
    addCollection,
    removeCollection,
    addRequestToCollection,
    removeRequestFromCollection,
    request,
    loadRequest,
    toggleCollections,
  } = useApiStore();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [newCollModal, setNewCollModal] = useState(false);
  const [saveReqModal, setSaveReqModal] = useState<string | null>(null); // collectionId
  const [collName, setCollName] = useState('');
  const [collDesc, setCollDesc] = useState('');
  const [reqName, setReqName] = useState('');

  // Load collections on mount
  useEffect(() => {
    const load = async () => {
      try {
        const colls = await invoke<Omit<ApiCollection, 'requests'>[]>('get_collections');
        // Load requests for each collection
        const full = await Promise.all(
          colls.map(async (c) => {
            const reqs = await invoke<SavedRequest[]>('get_requests', {
              collectionId: c.id,
            });
            return { ...c, requests: reqs };
          }),
        );
        setCollections(full);
      } catch (e) {
        toast.error(String(e));
      }
    };
    load();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreateCollection = async () => {
    if (!collName.trim()) return;
    try {
      const c = await invoke<ApiCollection>('save_collection', {
        name: collName.trim(),
        description: collDesc.trim(),
      });
      addCollection({ ...c, requests: [] });
      setCollName('');
      setCollDesc('');
      setNewCollModal(false);
      toast.success('Collection created');
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await invoke('delete_collection', { id });
      removeCollection(id);
      toast.success('Collection deleted');
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleSaveRequest = async (collectionId: string) => {
    if (!reqName.trim()) return;
    try {
      const saved = await invoke<SavedRequest>('save_request', {
        collectionId,
        name: reqName.trim(),
        method: request.method,
        url: request.url,
        headers: JSON.stringify(request.headers),
        params: JSON.stringify(request.params),
        body: request.body,
        bodyType: request.bodyType,
      });
      addRequestToCollection(collectionId, saved);
      setReqName('');
      setSaveReqModal(null);
      toast.success('Request saved');
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleDeleteRequest = async (collectionId: string, requestId: string) => {
    try {
      await invoke('delete_request', { id: requestId });
      removeRequestFromCollection(collectionId, requestId);
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <>
      {/* Panel */}
      <div className="flex flex-col h-full w-64 bg-gh-overlay border-r border-gh-border overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gh-border shrink-0">
          <span className="text-xs font-semibold text-gh-fg-muted uppercase tracking-wider">
            Collections
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="xs"
              icon={<Plus size={12} />}
              onClick={() => setNewCollModal(true)}
              title="New collection"
            />
            <Button
              variant="ghost"
              size="xs"
              icon={<X size={12} />}
              onClick={toggleCollections}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-1">
          {collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
              <FolderOpen size={28} className="text-gh-fg-subtle" />
              <p className="text-xs text-gh-fg-subtle">No collections yet</p>
              <Button
                variant="secondary"
                size="xs"
                icon={<Plus size={10} />}
                onClick={() => setNewCollModal(true)}
              >
                New collection
              </Button>
            </div>
          ) : (
            collections.map((c) => {
              const expanded = expandedIds.has(c.id);
              return (
                <div key={c.id}>
                  {/* Collection row */}
                  <div className="group flex items-center gap-1 px-2 py-1.5 hover:bg-gh-subtle cursor-pointer">
                    <button
                      onClick={() => toggleExpand(c.id)}
                      className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                    >
                      {expanded ? (
                        <ChevronDown size={12} className="text-gh-fg-subtle shrink-0" />
                      ) : (
                        <ChevronRight size={12} className="text-gh-fg-subtle shrink-0" />
                      )}
                      {expanded ? (
                        <FolderOpen size={13} className="text-gh-accent shrink-0" />
                      ) : (
                        <Folder size={13} className="text-gh-fg-muted shrink-0" />
                      )}
                      <span className="text-xs text-gh-fg truncate">{c.name}</span>
                    </button>

                    {/* Actions visible on hover */}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={<Save size={10} />}
                        title="Save current request here"
                        onClick={() => setSaveReqModal(c.id)}
                      />
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={<Trash2 size={10} />}
                        title="Delete collection"
                        onClick={() => handleDeleteCollection(c.id)}
                        className="hover:text-gh-danger"
                      />
                    </div>
                  </div>

                  {/* Requests under this collection */}
                  {expanded &&
                    c.requests.map((r) => (
                      <div
                        key={r.id}
                        className="group flex items-center gap-2 pl-8 pr-2 py-1 hover:bg-gh-subtle cursor-pointer"
                        onClick={() => loadRequest(r)}
                      >
                        <MethodBadge method={r.method} />
                        <span className="text-xs text-gh-fg truncate flex-1">{r.name}</span>
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<Trash2 size={10} />}
                          title="Delete request"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRequest(c.id, r.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-gh-danger"
                        />
                      </div>
                    ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New collection modal */}
      <Modal
        open={newCollModal}
        onClose={() => setNewCollModal(false)}
        title="New Collection"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewCollModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateCollection}
              disabled={!collName.trim()}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Name"
            placeholder="My API Collection"
            value={collName}
            onChange={(e) => setCollName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
            autoFocus
          />
          <Input
            label="Description (optional)"
            placeholder="What is this collection for?"
            value={collDesc}
            onChange={(e) => setCollDesc(e.target.value)}
          />
        </div>
      </Modal>

      {/* Save request modal */}
      <Modal
        open={saveReqModal !== null}
        onClose={() => setSaveReqModal(null)}
        title="Save Request"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveReqModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => saveReqModal && handleSaveRequest(saveReqModal)}
              disabled={!reqName.trim()}
            >
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Request name"
          placeholder="Get user by ID"
          value={reqName}
          onChange={(e) => setReqName(e.target.value)}
          onKeyDown={(e) =>
            e.key === 'Enter' && saveReqModal && handleSaveRequest(saveReqModal)
          }
          autoFocus
        />
      </Modal>
    </>
  );
}
