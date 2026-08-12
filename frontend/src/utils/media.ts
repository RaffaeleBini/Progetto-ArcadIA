export function getColabUrl(githubUrl: string): string {
  return githubUrl.replace("https://github.com/", "https://colab.research.google.com/github/");
}

export function getVideoEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.hostname.includes("youtube.com")) {
    const id = parsed.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}`;
    const match = parsed.pathname.match(/\/embed\/([\w-]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }

  if (parsed.hostname === "youtu.be") {
    const id = parsed.pathname.slice(1);
    if (id) return `https://www.youtube.com/embed/${id}`;
  }

  if (parsed.hostname.includes("vimeo.com")) {
    const id = parsed.pathname.split("/").filter(Boolean).pop();
    if (id) return `https://player.vimeo.com/video/${id}`;
  }

  return null;
}
