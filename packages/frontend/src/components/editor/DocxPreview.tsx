import { useState, useEffect } from 'react';
import mammoth from 'mammoth';

interface Props {
  base64: string;
}

export default function DocxPreview({ base64 }: Props) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    mammoth
      .convertToHtml({ arrayBuffer: bytes.buffer })
      .then((result) => {
        setHtml(result.value);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || '无法解析 DOCX 文件');
        setLoading(false);
      });
  }, [base64]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-base text-overlay0 text-sm">
        正在解析文档...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-base text-red text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-base p-6">
      <article
        className="prose prose-invert max-w-none markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
