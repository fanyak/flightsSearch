const G_CONSENT_URL = 'https://consent.google.com';
export const cookiesConsentRedirect = (url) => Promise.resolve({
  then: function (onFulfill, onReject) {
    if (url.match(new RegExp(`${G_CONSENT_URL}`, 'i'))) {
      onFulfill(G_CONSENT_URL);
    } else {
      onReject('not known redirect url');
    }
  }
});

function datePadding (m) {
  return m < 10 ? '0' + m : m;
}

export function getCurrentDateString () {
  const d = new Date();
  const year = d.getUTCFullYear();
  const day = datePadding(d.getDate());
  const month = datePadding(d.getMonth() + 1);
  return `${year}-${month}-${day}`;
}

export function parseResponse (res) {
  return res
    .split('\n')
    .map(el => el.replace(/[^\d|-]+/g, ' '))
    .filter(el => /(\d{4}-\d{2}-\d{2}\s){2}(\d+)/.test(el))
    .map(el => el.match(/(\d{4}-\d{2}-\d{2}\s){2}(\d+)/)[0])
    .map(el => el.trim().split(' '))
    .reduce((acc, cur) => {
      const obj = { start_date: '', end_date: '', price: '' };
      [obj.start_date, obj.end_date, obj.price] = cur;
      acc.push(obj);
      return acc;
    }, []);
}
