import { useMemo } from 'react';

const EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
};

interface Props {
  path: string;
  base64: string;
}

export default function ImagePreview({ path, base64 }: Props) {
  const src = useMemo(() => {
    const ext = path.split('.').pop()?.toLowerCase() ?? 'png';
    const mime = EXT_MIME[ext] || 'image/png';
    return `data:${mime};base64,${base64}`;
  }, [path, base64]);

  return (
    <div className="h-full flex items-center justify-center bg-base overflow-auto p-8">
      <img
        src={src}
        alt={path}
        className="max-w-full max-h-full object-contain rounded shadow-lg"
        draggable={false}
      />
    </div>
  );
}
