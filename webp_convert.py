"""
paleo-defense 이미지 일괄 WebP 변환

사용법 (public 폴더가 있는 위치에서):
  python webp_convert.py public                 # 미리보기 — 변환 없이 절감량만 계산
  python webp_convert.py public --apply         # 실제 변환 (원본은 그대로 둠)
  python webp_convert.py public --apply --delete-src   # 변환 성공한 원본 삭제

필요: pip install pillow

규칙
  png  → WebP 무손실 (픽셀 손실 0)
  jpg  → WebP 손실 품질 92 (원본이 이미 손실 압축이라 무손실로 하면 오히려 커짐)
  webp → 건너뜀 (/mob/ 웨이브 보스는 이미 변환됨)
  크기(해상도)는 절대 건드리지 않음 — 스킬 위치·크기 재조정 불필요
"""
import os
import sys
import argparse
from PIL import Image

PNG_EXT = {'.png'}
JPG_EXT = {'.jpg', '.jpeg'}
JPG_QUALITY = 92
METHOD = 4          # 6은 조금 더 작지만 수백 장이면 매우 느림


def human(n):
    for unit in ('B', 'KB', 'MB', 'GB'):
        if n < 1024:
            return f'{n:.1f}{unit}'
        n /= 1024
    return f'{n:.1f}TB'


def convert_one(src, apply):
    """반환: (원본크기, 결과크기, 에러메시지 또는 None)"""
    dst = os.path.splitext(src)[0] + '.webp'
    ext = os.path.splitext(src)[1].lower()
    before = os.path.getsize(src)
    try:
        im = Image.open(src)
        if ext in PNG_EXT:
            im = im.convert('RGBA')
            opts = dict(lossless=True, quality=100, method=METHOD)
        else:
            im = im.convert('RGB')
            opts = dict(quality=JPG_QUALITY, method=METHOD)

        if apply:
            im.save(dst, format='WEBP', **opts)
            after = os.path.getsize(dst)
        else:
            import io
            buf = io.BytesIO()
            im.save(buf, format='WEBP', **opts)
            after = buf.tell()
        return before, after, None
    except Exception as e:
        return before, before, f'{type(e).__name__}: {e}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('root', help='public 폴더 경로')
    ap.add_argument('--apply', action='store_true', help='실제로 변환 (없으면 미리보기)')
    ap.add_argument('--delete-src', action='store_true', help='변환 성공한 원본 삭제')
    args = ap.parse_args()

    if args.delete_src and not args.apply:
        print('--delete-src 는 --apply 와 함께 써야 합니다.')
        return

    targets = []
    for dirpath, _, files in os.walk(args.root):
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in PNG_EXT or ext in JPG_EXT:
                targets.append(os.path.join(dirpath, f))
    targets.sort()

    if not targets:
        print('변환할 png/jpg 가 없습니다. 경로를 확인하세요:', args.root)
        return

    print(f'{"미리보기" if not args.apply else "변환"} 대상 {len(targets)}장\n')

    stats = {}          # 최상위 폴더별 집계
    errors = []
    done = 0
    for src in targets:
        rel = os.path.relpath(src, args.root)
        top = rel.split(os.sep)[0] if os.sep in rel else '(루트)'
        before, after, err = convert_one(src, args.apply)
        if err:
            errors.append((rel, err))
        else:
            if args.apply and args.delete_src:
                try:
                    os.remove(src)
                except OSError as e:
                    errors.append((rel, f'원본 삭제 실패: {e}'))
        s = stats.setdefault(top, [0, 0, 0])
        s[0] += 1
        s[1] += before
        s[2] += after
        done += 1
        if done % 50 == 0:
            print(f'  … {done}/{len(targets)}')

    print(f'\n{"폴더":<16}{"장수":>6}{"변환 전":>12}{"변환 후":>12}{"절감":>10}')
    print('-' * 58)
    tb = ta = 0
    for k in sorted(stats):
        n, b, a = stats[k]
        tb += b
        ta += a
        cut = (1 - a / b) * 100 if b else 0
        print(f'{k:<16}{n:>6}{human(b):>12}{human(a):>12}{cut:>9.0f}%')
    print('-' * 58)
    cut = (1 - ta / tb) * 100 if tb else 0
    print(f'{"합계":<16}{len(targets):>6}{human(tb):>12}{human(ta):>12}{cut:>9.0f}%')

    if errors:
        print(f'\n실패 {len(errors)}건 (원본 그대로 둠):')
        for rel, e in errors[:30]:
            print('  ', rel, '—', e)
        if len(errors) > 30:
            print(f'   … 외 {len(errors) - 30}건')

    if not args.apply:
        print('\n실제로 바꾸려면 --apply 를 붙여 다시 실행하세요.')
    else:
        print('\n변환 완료. 코드의 이미지 경로 확장자를 .webp 로 바꿔야 화면에 나옵니다.')


if __name__ == '__main__':
    main()
