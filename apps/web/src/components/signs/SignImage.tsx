import { useTranslation } from 'react-i18next';
import type { Sign } from '../../lib/types';
import { pickLocalized } from '../../lib/utils';

export function SignImage({ sign, size = 76, className }: { sign: Sign; size?: number; className?: string }) {
  const { i18n } = useTranslation();
  const locale = i18n.language as 'ru' | 'kk' | 'en';
  return (
    <img
      src={sign.file}
      alt={pickLocalized(sign.title, locale)}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={className ?? 'sign-tile__img'}
      style={className ? undefined : { width: size, height: size }}
    />
  );
}