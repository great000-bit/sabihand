/**
 * Apps like Instagram, Facebook, TikTok and Snapchat open links in their own browser. Google refuses to sign anyone in
 * there ("disallowed_useragent"), so the person must open the page in Chrome or Safari first.
 */
export function inAppBrowser(ua: string): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|Snapchat|TikTok|musical_ly|BytedanceWebview|Twitter|LinkedInApp|Line\/|MicroMessenger|; wv\)/i.test(ua);
}
