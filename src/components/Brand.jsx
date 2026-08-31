import { appUrl, assetUrl } from '../paths';

export default function Brand({ light = false }) {
  return (
    <a className={`brand ${light ? 'brand--light' : ''}`} href={appUrl('/')} aria-label="Bob Maxey Ford Protect home">
      <img className="brand__dealer" src={assetUrl('/assets/bob-maxey-logo.png')} alt="Bob Maxey Ford and Lincoln" />
      <span className="brand__divider" aria-hidden="true" />
      <img className="brand__protect" src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" />
    </a>
  );
}
