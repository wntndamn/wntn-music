import type { Song } from '../types';

export function slugifyRussian(text: string) {
  const transliterationMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
    'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
    'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };

  // Transliterate Cyrillic characters
  let transliteratedText = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    transliteratedText += transliterationMap[char] || char;
  }

  // Apply standard slugification
  return transliteratedText
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing whitespace
    .replace(/[^a-z0-9\s-_]/g, '') // Remove non-alphanumeric characters (except spaces and hyphens)
    .replace(/\s+/g, '-') // Replace spaces with single hyphens
    .replace(/[-_]+/g, '-'); // Replace multiple hyphens with a single hyphen
}

export const slugifySong = (song: Song) => slugifyRussian(`${song.id.slice(0, 6)}-${song.author}-${song.title}`)