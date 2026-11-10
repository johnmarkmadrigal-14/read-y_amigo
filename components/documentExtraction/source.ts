import { File } from 'expo-file-system';

export type DocumentKind = 'pdf' | 'docx' | 'text' | 'image' | 'unsupported';
export type DocumentSource = { uri: string; name: string; mimeType?: string };
export function detectDocumentKind(name: string, mimeType?: string): DocumentKind {
  const ext = name.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (ext === 'txt' || mimeType?.startsWith('text/plain')) return 'text';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '') || mimeType?.startsWith('image/')) return 'image';
  return 'unsupported';
}
export async function fetchDocumentData(uri: string, headers?: Record<string, string>): Promise<{ base64: string; mimeType?: string }> {
  if (/^(file|content):/i.test(uri)) return { base64: await new File(uri).base64() };
  const response = await fetch(uri, headers ? { headers } : undefined);
  if (!response.ok) throw new Error(`Couldn't download the file (error ${response.status}).`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ base64: String(reader.result).split(',')[1], mimeType: response.headers.get('content-type') || undefined });
    reader.onerror = () => reject(new Error("Couldn't read the file."));
    reader.readAsDataURL(blob);
  });
}
export async function fetchDocumentText(uri: string, headers?: Record<string, string>): Promise<string> {
  if (/^(file|content):/i.test(uri)) return new File(uri).text();
  const response = await fetch(uri, headers ? { headers } : undefined);
  if (!response.ok) throw new Error(`Couldn't download the file (error ${response.status}).`);
  return response.text();
}
