// Plain constants shared by the upload action (server) and the drop zone (browser), so
// a too-big or wrong file is refused instantly, before it travels anywhere.

/** 8 MB per file. The Server Action body limit in next.config is 10 MB, so 8 MB of file
 *  plus the multipart overhead always fits. Raise both together. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** mime type → file extension in the bucket. Anything else is refused. */
export const ACCEPTED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/pdf": "pdf",
};

/** At most this many files are read at the same time (AI calls are slow and metered). */
export const UPLOAD_CONCURRENCY = 3;

/** The Obdelano tab shows this many of the latest decisions; search and CSV cover the rest. */
export const DONE_LIMIT = 100;
