import { getCurrentDateString } from './utils.mjs';

export const literals = {
  textSelectorFrom: 'div[role="search"] input[type="text"][role="combobox"][value]',
  textSelectorTo: 'div[role="search"] input[type="text"][role="combobox"][placeholder]',
  startDateSelector: `div[data-iso="${getCurrentDateString()}"]`,
  modalSelector: 'div[role="dialog"][aria-modal="true"][style]',
  xpath: '//button[contains(., "Price graph")]',
  calendarUrl: 'https://www.google.com/_/TravelFrontendUi/data/travel.frontend.flights.FlightsFrontendService/GetCalendarGraph',
  nextButton: 'div[role="dialog"][aria-modal="true"] button[aria-label="Scroll forward"]'
};
