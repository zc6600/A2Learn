const STORAGE_KEY = "a2learn.recent-projects.v1";
const MAX_RECENT_PROJECTS = 8;

export type RecentProject = {
  id: string;
  title: string;
  openedAt: string;
};

function read(): RecentProject[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is RecentProject =>
        item && typeof item.id === "string" && typeof item.title === "string" && typeof item.openedAt === "string",
    );
  } catch {
    return [];
  }
}

export function recentProjects(): RecentProject[] {
  return read();
}

export function rememberProject(id: string, title: string): void {
  const next = [{ id, title, openedAt: new Date().toISOString() }, ...read().filter((item) => item.id !== id)]
    .slice(0, MAX_RECENT_PROJECTS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a full storage quota should not stop page editing.
  }
}
