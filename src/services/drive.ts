import { PlayerProfile } from '../game/types';

export interface DriveSaveMetadata {
  id: string;
  name: string;
  size?: string;
  modifiedTime: string;
}

/**
 * Uploads a player save file to Google Drive using multipart upload
 */
export async function uploadSaveToDrive(
  player: PlayerProfile,
  accessToken: string
): Promise<{ id: string; name: string }> {
  const fileName = `ragnarok_save_${player.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_lv${player.baseLevel}.json`;
  const fileContent = JSON.stringify(player, null, 2);

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `Ragnarok: Chronicles of Midgarts 3D Cloud Save for ${player.name} (Lv ${player.baseLevel} ${player.job})`,
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload to Google Drive: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return { id: result.id, name: result.name };
}

/**
 * Lists Ragnarok save files from Google Drive
 */
export async function listDriveSaves(accessToken: string): Promise<DriveSaveMetadata[]> {
  const query = encodeURIComponent("name contains 'ragnarok_save_' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,modifiedTime)&orderBy=modifiedTime desc&pageSize=15`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list Google Drive files: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Downloads a player save file from Google Drive by fileId
 */
export async function downloadSaveFromDrive(
  fileId: string,
  accessToken: string
): Promise<PlayerProfile> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to download file from Google Drive: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  if (!json.name || !json.stats) {
    throw new Error('Downloaded file does not match a valid Ragnarok character save structure.');
  }

  return json as PlayerProfile;
}

/**
 * Deletes a save file from Google Drive
 * IMPORTANT: MUST be preceded by an explicit user confirmation dialog in UI!
 */
export async function deleteDriveSave(fileId: string, accessToken: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete file from Google Drive: ${response.status} ${errorText}`);
  }
}
