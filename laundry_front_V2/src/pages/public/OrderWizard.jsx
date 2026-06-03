import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPublicCategories, submitPublicOrder } from '../../api/publicApi';
import WizardLayout from './WizardLayout';
import StepSelection from './StepSelection';
import StepInfo from './StepInfo';
import StepReview from './StepReview';
import StepSuccess from './StepSuccess';

export default function OrderWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const initialCategory = location.state?.initialCategory ?? null;

  const [step,        setStep]        = useState(0);
  const [categories,  setCategories]  = useState([]);
  const [cart,        setCart]        = useState([]);
  const [info,        setInfo]        = useState({
    clientName: '', clientPhone: '', clientAddress: '', notes: '',
    deliveryLatitude: null, deliveryLongitude: null,
  });
  const [honeypot,    setHoneypot]    = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    getPublicCategories()
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        clientName:        info.clientName.trim(),
        clientPhone:       info.clientPhone.trim(),
        clientAddress:     info.clientAddress.trim()  || undefined,
        deliveryLatitude:  info.deliveryLatitude      || undefined,
        deliveryLongitude: info.deliveryLongitude     || undefined,
        notes:             info.notes.trim()          || undefined,
        website:           honeypot                   || undefined,
        items: cart.map(c => ({
          productId: c.productId,
          quantite:  c.quantite,
          largeur:   c.largeur  || undefined,
          longueur:  c.longueur || undefined,
          poids:     c.poids    || undefined,
        })),
      };
      const res = await submitPublicOrder(payload);
      setOrderNumber(res?.orderNumber || '');
      setStep(3);
    } catch (e) {
      if (e?.response?.status === 429) {
        setError(t('public.rate_limited', { defaultValue: 'Trop de tentatives. Veuillez patienter.' }));
      } else {
        setError(t('public.submit_error'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Honeypot — zero size, no layout impact */}
      <input aria-hidden tabIndex={-1} autoComplete="off" name="website"
        value={honeypot} onChange={e => setHoneypot(e.target.value)}
        style={{ opacity: 0, position: 'fixed', top: 0, left: 0, width: 0, height: 0, border: 0, padding: 0 }} />

      <WizardLayout step={step}>
        {step === 0 && (
          <StepSelection
            categories={categories}
            cart={cart}
            setCart={setCart}
            initialCategory={initialCategory}
            onNext={() => setStep(1)}
            onBack={() => navigate('/order')}
          />
        )}
        {step === 1 && (
          <StepInfo
            info={info}
            setInfo={setInfo}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepReview
            cart={cart}
            info={info}
            submitting={submitting}
            error={error}
            onSubmit={handleSubmit}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepSuccess
            orderNumber={orderNumber}
            onNewOrder={() => navigate('/order')}
          />
        )}
      </WizardLayout>
    </>
  );
}
