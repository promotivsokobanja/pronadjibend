import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const child = spawn(ffmpegPath, args, { windowsHide: true });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `FFmpeg exited with code ${code}`));
    });
  });
}

function extForMime(mimeType) {
  if (mimeType === 'video/webm') return 'webm';
  if (mimeType === 'video/quicktime') return 'mov';
  return 'mp4';
}

export async function transcodeVideoBuffer(inputBuffer, mimeType) {
  const enabled = toBool(process.env.MEDIA_VIDEO_TRANSCODE_ENABLED, true);
  if (!enabled) {
    return {
      buffer: inputBuffer,
      mimeType,
      ext: extForMime(mimeType),
      transcoded: false,
      reason: 'disabled',
    };
  }

  const strict = toBool(process.env.MEDIA_VIDEO_TRANSCODE_STRICT, false);
  const maxWidth = Number(process.env.MEDIA_VIDEO_MAX_WIDTH || 1280);
  const maxHeight = Number(process.env.MEDIA_VIDEO_MAX_HEIGHT || 720);
  const crf = Number(process.env.MEDIA_VIDEO_CRF || 28);
  const preset = process.env.MEDIA_VIDEO_PRESET || 'veryfast';

  const baseDir = path.join(tmpdir(), 'pronadjibend-media');
  const id = randomUUID();
  const inputPath = path.join(baseDir, `${id}-in.${extForMime(mimeType)}`);
  const outputPath = path.join(baseDir, `${id}-out.mp4`);

  try {
    await fs.mkdir(baseDir, { recursive: true });
    await fs.writeFile(inputPath, inputBuffer);

    await runFfmpeg([
      '-y',
      '-i',
      inputPath,
      '-vf',
      `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`,
      '-c:v',
      'libx264',
      '-preset',
      String(preset),
      '-crf',
      String(crf),
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      outputPath,
    ]);

    const outputBuffer = await fs.readFile(outputPath);
    return {
      buffer: outputBuffer,
      mimeType: 'video/mp4',
      ext: 'mp4',
      transcoded: true,
      reason: null,
    };
  } catch (error) {
    if (strict) {
      throw error;
    }

    console.warn('Video transcode skipped:', error?.message || error);
    return {
      buffer: inputBuffer,
      mimeType,
      ext: extForMime(mimeType),
      transcoded: false,
      reason: 'ffmpeg_unavailable_or_failed',
    };
  } finally {
    await Promise.allSettled([
      fs.unlink(inputPath),
      fs.unlink(outputPath),
    ]);
  }
}
