import { appUrl, assetUrl } from '../paths';

export default function Brand({ light = false, interactive = true }) {
  const Element = interactive ? 'a' : 'div';
  return (
    <Element className={`brand ${light ? 'brand--light' : ''}`} href={interactive ? appUrl('/') : undefined} aria-label={interactive ? 'Bob Maxey Ford Protect home' : undefined}>
      <img className="brand__dealer" src={assetUrl('/assets/bob-maxey-logo.png')} alt="Bob Maxey Ford and Lincoln" />
      <span className="brand__divider" aria-hidden="true" />
      <img className="brand__protect" src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" />
    </Element>
  );
}
