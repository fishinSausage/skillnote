const paths = {
  journal:'<path d="M5 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 1-2ZM8 4v16m3-11h5m-5 4h4"/>',
  work:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 11a24 24 0 0 0 18 0m-9 0v3"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M7.5 3v4m9-4v4m-13 3h17"/>',
  pen:'<path d="m14.5 5 4.5 4.5M4 20l4.6-1.2L20 7.4a2.2 2.2 0 0 0 0-3.1l-.3-.3a2.2 2.2 0 0 0-3.1 0L5.2 15.4 4 20Z"/>',
  spark:'<path d="m10 3 1.9 5.5L17 11l-5.1 2.1L10 19l-2.1-5.9L3 11l4.9-2.5L10 3Zm8.4 11 .9 2.6 2.7.9-2.7 1-.9 2.5-.9-2.5-2.6-1 2.6-.9.9-2.6Z"/>',
  layers:'<path d="m3 8 9-5 9 5-9 5-9-5Zm0 4.5 9 5 9-5m-18 4.5 9 5 9-5"/>',
  history:'<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6m3-5v6l4 2"/>',
  bulb:'<path d="M9 16c0-2.5-3-3-3-7a6 6 0 0 1 12 0c0 4-3 4.5-3 7H9Zm0 3h6m-5 2h4"/>',
  file:'<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h5"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/>',
  check:'<path d="m5 12 4 4 10-10"/>',
  chev:'<path d="m9 6 6 6-6 6"/>',
  back:'<path d="m14 5-7 7 7 7"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  book:'<path d="M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1zM12 5v15"/>',
  play:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/>',
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0m-7 7v4m-4 0h8"/>',
  external:'<path d="M14 3h7v7m0-7L11 13M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>',
  close:'<path d="m6 6 12 12m0-12L6 18"/>',
  list:'<path d="M8 6h12M8 12h9M8 18h6M4 6h.1M4 12h.1M4 18h.1"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  bag:'<rect x="4" y="6" width="16" height="15" rx="3"/><path d="M8 7V5a4 4 0 0 1 8 0v2m-9 5h10"/>',
  archive:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9m-9 4h4"/>'
};
export function icon(id) {
  return '<svg class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + paths[id] + '</svg>';
}
