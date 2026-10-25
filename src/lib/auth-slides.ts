/** The pictures beside the sign-in and sign-up forms. They change every 5 seconds. Add a file under /public/auth and a line here; never repeat a photo. */
export interface Slide {
  src: string;
  alt: string;
}

export const AUTH_SLIDES: Slide[] = [{ src: "/auth/mechanics.jpg", alt: "A mechanic and a colleague checking a tyre in a workshop" }];

export const SLIDE_SECONDS = 5;
