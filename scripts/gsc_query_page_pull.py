# Pull query+page Search Console rows (90 days, junk excluded) for one or more sites
# registered in sites.json (see sites.example.json).
# Usage: python gsc_query_page_pull.py <out.json> <site1> [site2 ...] [--days 90] [--key path/to/key.json]
import sys, json, datetime, argparse, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import google_data as g


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out_json')
    ap.add_argument('sites', nargs='+')
    ap.add_argument('--days', type=int, default=90)
    ap.add_argument('--key', default=g.DEFAULT_KEY)
    ap.add_argument('--sites-config', default=g.DEFAULT_SITES_FILE)
    a = ap.parse_args()

    registered = g.load_sites(a.sites_config)
    s = g.session(a.key)
    end = datetime.date.today() - datetime.timedelta(days=3)
    start = end - datetime.timedelta(days=a.days - 1)
    out = {}
    for p in a.sites:
        site = registered[p]['gsc']
        rows = g.gsc(s, site, str(start), str(end), ['query', 'page'])
        out[p] = [{'q': r['keys'][0], 'page': r['keys'][1], 'impr': r['impressions'],
                    'clicks': r['clicks'], 'pos': round(r['position'], 1)}
                   for r in rows if not g.is_junk(r['keys'][0])]
        print(p, len(rows), len(out[p]))
    json.dump(out, open(a.out_json, 'w', encoding='utf-8'))


if __name__ == '__main__':
    main()
