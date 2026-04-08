// Utility to load html2pdf.js dynamically (for browser-only usage)
export async function loadHtml2Pdf() {
  if (typeof window === 'undefined') return null;
  if (typeof (window).html2pdf === 'function') return (window).html2pdf;
  await new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-html2pdf="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load PDF export library.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    script.dataset.html2pdf = 'true';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load PDF export library.'));
    document.body.appendChild(script);
  });
  return (window as any).html2pdf;
}

/**
 * Robustly trigger a PDF download.
 * Uses output('blob') and a manual link download, which is more reliable
 * on mobile browsers than the default .save() method.
 */
export async function triggerPdfDownload(worker: any, fileName: string) {
  try {
    const blob = await worker.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    // For mobile Safari and some other browsers, appending to body helps
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('PDF Download failed:', error);
    // Fallback to default save if blob method fails
    return worker.save();
  }
}
