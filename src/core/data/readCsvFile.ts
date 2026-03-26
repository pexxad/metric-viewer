/**
 * Read a File object as text using FileReader.
 */
export function readCsvFile(
  file: File,
): Promise<{ text: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ text: reader.result as string, fileName: file.name });
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsText(file);
  });
}
