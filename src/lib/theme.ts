/**
 * The site theme rule, in one place: dark unless someone explicitly chose
 * light. Dark is the primary look, so a visitor with no stored choice gets it.
 */
export const THEME_KEY = "theme";

/** Whether a stored theme value means dark. `null` = no choice yet. */
export function prefersDark(stored: string | null): boolean {
  return stored !== "light";
}

/**
 * Inline <script> for the root layout: sets the class before first paint.
 * Must agree with prefersDark — test/theme.test.tsx runs both to check.
 */
export const THEME_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(
  THEME_KEY
)})!=='light'){document.documentElement.classList.add('dark')}}catch(e){}`;

/** The stored choice, or undefined when storage can't be read at all. */
export function readStoredTheme(): string | null | undefined {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return undefined;
  }
}
