import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { PlayerProfile } from '../types';
import { generateSaveHash } from '../rules';
import { sound } from '../audio';
import {
  auth,
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  saveProfileToFirestore,
  loadProfileFromFirestore,
} from '../../services/firebase';
import {
  uploadSaveToDrive,
  listDriveSaves,
  downloadSaveFromDrive,
  deleteDriveSave,
  DriveSaveMetadata,
} from '../../services/drive';
import { openGooglePicker } from '../../services/picker';

interface CloudSyncModalProps {
  player: PlayerProfile;
  onImportProfile: (imported: PlayerProfile) => void;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  player,
  onImportProfile,
  onClose,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Status and messages
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'uploading' | 'loading'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Google Drive file list
  const [driveFiles, setDriveFiles] = useState<DriveSaveMetadata[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);

  // Offline / Manual JSON
  const [importJson, setImportJson] = useState('');

  // Confirmation Modals for Destructive Operations
  const [confirmModal, setConfirmModal] = useState<{
    type: 'overwrite_firestore' | 'overwrite_drive' | 'delete_drive';
    targetName?: string;
    targetId?: string;
    payload?: PlayerProfile;
  } | null>(null);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        if (token) setAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );

    // Initial check
    if (auth.currentUser) {
      setCurrentUser(auth.currentUser);
      getAccessToken().then((token) => setAccessToken(token));
    }

    return () => unsubscribe();
  }, []);

  const currentChecksum = generateSaveHash(player);

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    sound.playClick();
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      setCurrentUser(result.user);
      setAccessToken(result.accessToken);
      sound.playLevelUp();
      setSyncMessage(`🎉 Welcome, ${result.user.displayName || 'Adventurer'}! Google Account & Drive connected.`);
    } catch (err: any) {
      console.error(err);
      sound.playHit();
      setErrorMessage(err.message || 'Failed to authenticate with Google.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle Google Sign-Out
  const handleLogout = async () => {
    sound.playClick();
    try {
      await logout();
      setCurrentUser(null);
      setAccessToken(null);
      setDriveFiles([]);
      setSyncMessage('Signed out from Google Account.');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Firestore Instant Cloud Sync
  const handleFirestoreSave = async () => {
    if (!currentUser) {
      setErrorMessage('Please sign in with Google first to sync to Firebase Firestore.');
      return;
    }

    sound.playClick();
    setSyncStatus('syncing');
    setErrorMessage(null);
    setSyncMessage(null);

    try {
      await saveProfileToFirestore(player, currentUser);
      sound.playLevelUp();
      setSyncStatus('idle');
      setSyncMessage('☁️ Firestore Cloud Save verified! Character synchronized across devices.');
    } catch (err: any) {
      sound.playHit();
      setSyncStatus('idle');
      setErrorMessage(`Firestore sync error: ${err.message}`);
    }
  };

  // Firestore Load
  const handleFirestoreLoad = async () => {
    if (!currentUser) {
      setErrorMessage('Please sign in with Google first.');
      return;
    }

    sound.playClick();
    setSyncStatus('loading');
    setErrorMessage(null);

    try {
      const loaded = await loadProfileFromFirestore(currentUser.uid);
      if (!loaded) {
        sound.playHit();
        setSyncStatus('idle');
        setErrorMessage('No Firestore cloud save found for this account.');
        return;
      }

      setSyncStatus('idle');
      // Prompt confirmation before overwriting
      setConfirmModal({
        type: 'overwrite_firestore',
        targetName: `${loaded.name} (Lv ${loaded.baseLevel} ${loaded.job})`,
        payload: loaded,
      });
    } catch (err: any) {
      sound.playHit();
      setSyncStatus('idle');
      setErrorMessage(`Failed to load from Firestore: ${err.message}`);
    }
  };

  // Google Drive: Backup to Drive
  const handleBackupToDrive = async () => {
    if (!currentUser || !accessToken) {
      setErrorMessage('Please sign in with Google to grant Drive access.');
      return;
    }

    sound.playClick();
    setSyncStatus('uploading');
    setErrorMessage(null);
    setSyncMessage(null);

    try {
      const res = await uploadSaveToDrive(player, accessToken);
      sound.playLevelUp();
      setSyncStatus('idle');
      setSyncMessage(`📁 Saved to Google Drive as "${res.name}"!`);
      // Refresh list
      handleListDriveFiles();
    } catch (err: any) {
      sound.playHit();
      setSyncStatus('idle');
      setErrorMessage(`Drive upload error: ${err.message}`);
    }
  };

  // Google Drive: List files
  const handleListDriveFiles = async () => {
    if (!accessToken) return;
    setIsLoadingDriveFiles(true);
    try {
      const files = await listDriveSaves(accessToken);
      setDriveFiles(files);
    } catch (err: any) {
      setErrorMessage(`Drive list error: ${err.message}`);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  // Google Drive: Download save
  const handleDownloadDriveFile = async (file: DriveSaveMetadata) => {
    if (!accessToken) return;
    sound.playClick();
    setSyncStatus('loading');
    try {
      const loaded = await downloadSaveFromDrive(file.id, accessToken);
      setSyncStatus('idle');
      // Require confirmation
      setConfirmModal({
        type: 'overwrite_drive',
        targetName: file.name,
        payload: loaded,
      });
    } catch (err: any) {
      sound.playHit();
      setSyncStatus('idle');
      setErrorMessage(`Failed to load from Google Drive: ${err.message}`);
    }
  };

  // Google Drive: Delete file (Requires Confirmation Dialog)
  const promptDeleteDriveFile = (file: DriveSaveMetadata) => {
    sound.playClick();
    setConfirmModal({
      type: 'delete_drive',
      targetName: file.name,
      targetId: file.id,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    sound.playClick();

    if (confirmModal.type === 'overwrite_firestore' || confirmModal.type === 'overwrite_drive') {
      if (confirmModal.payload) {
        onImportProfile(confirmModal.payload);
        sound.playLevelUp();
        setSyncMessage(`✅ Character successfully restored: ${confirmModal.payload.name}!`);
      }
      setConfirmModal(null);
    } else if (confirmModal.type === 'delete_drive') {
      if (confirmModal.targetId && accessToken) {
        try {
          await deleteDriveSave(confirmModal.targetId, accessToken);
          sound.playHit();
          setSyncMessage(`🗑️ File "${confirmModal.targetName}" removed from Google Drive.`);
          setDriveFiles((prev) => prev.filter((f) => f.id !== confirmModal.targetId));
        } catch (err: any) {
          setErrorMessage(`Delete failed: ${err.message}`);
        }
      }
      setConfirmModal(null);
    }
  };

  // Google Picker: Open file picker
  const handleOpenGooglePicker = async () => {
    if (!accessToken) {
      setErrorMessage('Please sign in with Google first to access Google Picker.');
      return;
    }

    sound.playClick();
    setSyncMessage('Opening Google Picker...');

    try {
      await openGooglePicker({
        accessToken,
        onPicked: async (doc) => {
          sound.playClick();
          setSyncMessage(`Picked: ${doc.name}. Downloading content...`);
          try {
            const loaded = await downloadSaveFromDrive(doc.id, accessToken);
            setConfirmModal({
              type: 'overwrite_drive',
              targetName: doc.name,
              payload: loaded,
            });
          } catch (err: any) {
            setErrorMessage(`Failed to parse selected file: ${err.message}`);
          }
        },
        onCancel: () => {
          setSyncMessage('Google Picker cancelled.');
        },
        onError: (err: any) => {
          setErrorMessage(`Google Picker error: ${err.message || 'Could not load picker'}`);
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Offline / Clipboard Export
  const handleExportClipboard = () => {
    sound.playClick();
    const dataStr = JSON.stringify(player, null, 2);
    navigator.clipboard?.writeText(dataStr);
    setSyncMessage('📋 Save file JSON copied to clipboard!');
  };

  // Offline / Clipboard Import
  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJson) as PlayerProfile;
      if (!parsed.name || !parsed.stats) {
        throw new Error('Invalid profile schema');
      }
      sound.playLevelUp();
      onImportProfile(parsed);
      setSyncMessage(`✅ Successfully restored profile for ${parsed.name} (Lv ${parsed.baseLevel})!`);
      setImportJson('');
    } catch {
      sound.playHit();
      setErrorMessage('Failed to parse save data JSON. Please check file formatting.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="cloud-sync-modal"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base font-black uppercase tracking-wider text-amber-400">
              Cloud Synchronization & Backup
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
              Firebase & Google Drive
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          {/* User Auth Section */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-10 h-10 rounded-full border border-amber-400"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center font-bold text-amber-300">
                    {currentUser.displayName ? currentUser.displayName[0] : 'G'}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{currentUser.displayName || 'Google Adventurer'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{currentUser.email}</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">Connect Google Account</span>
                <span className="text-[11px] text-slate-400">
                  Required for Firebase Cloud Saves, Google Drive Backups, and Google Picker.
                </span>
              </div>
            )}

            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            ) : (
              /* Official Google Sign-In Button format */
              <button
                type="button"
                disabled={isSigningIn}
                onClick={handleGoogleSignIn}
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 active:scale-95 text-slate-800 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>

          {/* Feedback Toasts */}
          {syncMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-xs text-center text-emerald-300 font-medium animate-fadeIn">
              {syncMessage}
            </div>
          )}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/60 text-xs text-center text-red-300 font-medium animate-fadeIn">
              {errorMessage}
            </div>
          )}

          {/* SECTION 1: Firebase Firestore Cloud Sync */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wide text-amber-400">
                  🔥 Firebase Firestore Cloud
                </span>
                <p className="text-[11px] text-slate-400">
                  Instant cloud synchronization across mobile and desktop browsers.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Hash: {currentChecksum.slice(0, 10)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                disabled={!currentUser || syncStatus === 'syncing'}
                onClick={handleFirestoreSave}
                className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow"
              >
                {syncStatus === 'syncing' ? 'Syncing...' : 'Save to Firestore Cloud ☁️'}
              </button>
              <button
                type="button"
                disabled={!currentUser || syncStatus === 'loading'}
                onClick={handleFirestoreLoad}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Restore from Firestore Cloud
              </button>
            </div>
          </div>

          {/* SECTION 2: Google Drive & Google Picker Integration */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wide text-sky-400">
                  📂 Google Drive & Google Picker
                </span>
                <p className="text-[11px] text-slate-400">
                  Store character save files directly in your Google Drive or pick an existing save file.
                </p>
              </div>
              <button
                type="button"
                disabled={!accessToken}
                onClick={handleListDriveFiles}
                className="text-[10px] text-sky-400 hover:underline font-bold"
              >
                {isLoadingDriveFiles ? 'Refreshing...' : 'Refresh Drive'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!accessToken || syncStatus === 'uploading'}
                onClick={handleBackupToDrive}
                className="py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow"
              >
                {syncStatus === 'uploading' ? 'Uploading...' : 'Backup to Google Drive ⬆️'}
              </button>

              <button
                type="button"
                disabled={!accessToken}
                onClick={handleOpenGooglePicker}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow"
              >
                Browse Drive with Google Picker 🔍
              </button>
            </div>

            {/* List of Files found on Google Drive */}
            {driveFiles.length > 0 && (
              <div className="mt-2 flex flex-col gap-1.5 border-t border-slate-800 pt-2">
                <span className="text-[11px] font-bold text-slate-400">
                  Saved Characters on Google Drive:
                </span>
                <div className="max-h-32 overflow-y-auto flex flex-col gap-1">
                  {driveFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                    >
                      <div className="overflow-hidden mr-2">
                        <div className="font-semibold text-slate-200 truncate">{file.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(file.modifiedTime).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownloadDriveFile(file)}
                          className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-[10px]"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => promptDeleteDriveFile(file)}
                          className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-[10px]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Offline Clipboard Fallback */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              📋 Offline Clipboard / Manual JSON
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportClipboard}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
              >
                Export JSON to Clipboard
              </button>
            </div>

            <div className="mt-1">
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste save file JSON here..."
                rows={2}
                className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:border-amber-400 focus:outline-none"
              />
              <button
                type="button"
                disabled={!importJson.trim()}
                onClick={handleImportJson}
                className="mt-1.5 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wide"
              >
                Import from JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Destructive Operations (MANDATORY REQUIREMENT) */}
      {confirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-500/80 rounded-2xl p-6 text-slate-100 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-base font-black text-amber-300">
                  {confirmModal.type === 'delete_drive'
                    ? 'Confirm File Deletion'
                    : 'Confirm Overwriting Current Character'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {confirmModal.type === 'delete_drive'
                    ? `Are you sure you want to delete "${confirmModal.targetName}" from Google Drive? This action cannot be undone.`
                    : `Loading "${confirmModal.targetName}" will replace your currently active character data in this session. Proceed?`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer ${
                  confirmModal.type === 'delete_drive'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {confirmModal.type === 'delete_drive' ? 'Delete File' : 'Overwrite & Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
