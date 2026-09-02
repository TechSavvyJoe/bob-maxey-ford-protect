import { ArrowRight } from 'lucide-react';
import { afterSaleProductCategories } from '../data';
import { assetUrl } from '../paths';

const goalCopy = {
  mechanical: {
    eyebrow: 'Unexpected repairs',
    title: 'Protect major vehicle systems',
    text: 'Compare four Ford-backed coverage levels, from core powertrain protection to comprehensive component coverage.',
    action: 'Compare coverage levels',
  },
  maintenance: {
    eyebrow: 'Planned ownership costs',
    title: 'Plan ahead for maintenance',
    text: 'Explore scheduled service, selected wear items and continued-coverage paths for eligible vehicles.',
    action: 'Explore maintenance',
  },
  electric: {
    eyebrow: 'Electric vehicle ownership',
    title: 'Match protection to your EV',
    text: 'Review EV-specific mechanical protection and maintenance built around eligible electric-vehicle systems.',
    action: 'Explore EV coverage',
  },
  specialty: {
    eyebrow: 'Work and specialty vehicles',
    title: 'Get a vehicle-specific review',
    text: 'Commercial, incomplete and medium-duty vehicles receive a record-level eligibility and usage review.',
    action: 'Explore specialty paths',
  },
};

const orderedCategoryIds = ['mechanical', 'maintenance', 'electric', 'specialty'];

export default function HomeOverview({ onNavigate, onQuote }) {
  const categories = orderedCategoryIds
    .map((id) => afterSaleProductCategories.find((category) => category.id === id))
    .filter(Boolean);

  const takeAction = (category) => {
    if (category.id === 'mechanical') return onNavigate('compare');
    if (category.id === 'electric') return onQuote({ powertrain: 'Electric', planId: 'premium-plus-ev' });
    return onNavigate('products');
  };

  return (
    <section className="home-overview section">
      <div className="page-shell home-overview__heading">
        <div>
          <span className="product-type">Find your starting point</span>
          <h2>Start with what you want to protect.</h2>
          <p>Choose an ownership goal, then explore the matching product family and vehicle-specific next steps.</p>
        </div>
        <img src={assetUrl('/assets/ford-official/ford-protect-logo.png')} alt="Ford Protect" />
      </div>

      <div className="page-shell home-goal-grid">
        {categories.map((category, index) => {
          const copy = goalCopy[category.id];
          return (
            <article className={`home-goal-card home-goal-card--${index + 1}`} key={category.id}>
              <figure><img src={assetUrl(category.image)} alt={category.imageAlt} /></figure>
              <div>
                <span>{copy.eyebrow}</span>
                <h3>{copy.title}</h3>
                <p>{copy.text}</p>
                <button type="button" onClick={() => takeAction(category)}>{copy.action} <ArrowRight /></button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="page-shell home-goal-footer">
        <p>Not sure where to begin? Start with your vehicle and Bob Maxey will organize the eligible paths.</p>
        <button className="button button--primary" type="button" onClick={() => onQuote()}>Start with my vehicle <ArrowRight /></button>
        <button type="button" onClick={() => onNavigate('products')}>Browse every product</button>
      </div>
    </section>
  );
}
