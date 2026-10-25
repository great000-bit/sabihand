/** The pictures beside the sign-in and sign-up forms. They change every 5 seconds. Add a file under /public/auth and a line here; never repeat a photo. */
export interface Slide {
  src: string;
  alt: string;
  /** Where to anchor the crop, as an object-position value. Default centre. */
  position?: string;
}

export const AUTH_SLIDES: Slide[] = [
  { src: "/auth/mechanics.jpg", alt: "A mechanic and a colleague checking a tyre in a workshop" },
  { src: "/auth/barber.jpg", alt: "A barber cutting a customer's hair in a barbershop chair", position: "top" },
];

export const SLIDE_SECONDS = 5;
