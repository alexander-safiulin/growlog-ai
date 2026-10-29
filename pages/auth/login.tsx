import { LoginPageClient } from '@/components/auth/LoginPageClient';
import { PublicSeoHead } from '@/components/seo/PublicSeoHead';
import type { Locale } from '@/lib/i18n/locales';
import { resolveServerLocale } from '@/lib/i18n/server-locale';
import { publicSeoCopy } from '@/lib/seo/public-pages';
import type { GetServerSideProps } from 'next';

type Props = { locale: Locale };

export default function LoginPage({ locale }: Props) {
  const { title, description } = publicSeoCopy('login', locale);

  return (
    <>
      <PublicSeoHead
        path="/auth/login"
        title={title}
        description={description}
        locale={locale}
        index={false}
      />
      <LoginPageClient />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => ({
  props: { locale: resolveServerLocale(ctx) },
});
