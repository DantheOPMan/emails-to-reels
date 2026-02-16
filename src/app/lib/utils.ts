export const getSmartChunks = (text: string) => {
  if (!text) return [];
  
  // Clean up text
  const clean = text
    .replace(/https?:\/\/\S+/g, '') // Remove links
    .replace(/[^\w\s.,?!'"@]/g, '') // Remove special chars
    .replace(/\s+/g, " ")
    .trim();

  const words = clean.split(" ");
  const chunks: string[] = [];
  
  let currentChunk: string[] = [];
  
  for (const word of words) {
    currentChunk.push(word);
    
    const wordCount = currentChunk.length;
    // Break on punctuation or if length is > 4
    const endsWithPunctuation = /[.?!,;:]$/.test(word);
    
    if ((endsWithPunctuation && wordCount >= 3) || wordCount >= 5) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [];
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }
  
  return chunks;
};
