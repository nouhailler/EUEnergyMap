// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  OnboardingLegalModal,
  ONBOARDING_STORAGE_KEY,
} from '../components/common/OnboardingLegalModal';
import { Footer } from '../components/common/Footer';

describe('Onboarding and Legal Mentions Test', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders OnboardingLegalModal on step 0 (Bienvenue) and navigates to legal disclaimer', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <OnboardingLegalModal
          isOpen={true}
          onClose={onClose}
          initialStep={0}
        />
      );
    });

    expect(div.innerHTML).toContain("Guide d'accueil &amp; Mentions Légales");
    expect(div.innerHTML).toContain("Bienvenue sur EU Energy Map");

    root.unmount();
  });

  it('renders Step 2 (Mentions Légales & Non-Responsabilité) with explicit disclaimer and electricitymaps link', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <OnboardingLegalModal
          isOpen={true}
          onClose={onClose}
          initialStep={2}
        />
      );
    });

    const html = div.innerHTML;
    // Vérification de la clause de non-responsabilité expresse
    expect(html).toContain('Clause de non-responsabilité');
    expect(html).toContain("décline expressément toute responsabilité quant à la pertinence");
    // Vérification de la source officielle
    expect(html).toContain('https://app.electricitymaps.com/');

    root.unmount();
  });

  it('stores acceptance in localStorage upon clicking accept on legal step', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <OnboardingLegalModal
          isOpen={true}
          onClose={onClose}
          initialStep={2}
        />
      );
    });

    // Checkbox de prise de connaissance
    const checkbox = div.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();

    await act(async () => {
      checkbox.click();
    });

    // Trouver le bouton d'acceptation
    const acceptButton = Array.from(div.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Accéder à l’application')
    );
    expect(acceptButton).toBeDefined();

    await act(async () => {
      acceptButton?.click();
    });

    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('true');
    expect(onClose).toHaveBeenCalled();

    root.unmount();
  });

  it('renders Footer with legal button and explicit electricitymaps disclaimer', async () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    const onOpenLegal = vi.fn();

    await act(async () => {
      root.render(
        <Footer onOpenLegal={onOpenLegal} />
      );
    });

    const html = div.innerHTML;
    expect(html).toContain('Mentions Légales &amp; Non-responsabilité');
    expect(html).toContain('https://app.electricitymaps.com/');
    expect(html).toContain('Clause de non-responsabilité');

    const legalBtn = Array.from(div.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Mentions Légales')
    );
    expect(legalBtn).toBeDefined();

    await act(async () => {
      legalBtn?.click();
    });
    expect(onOpenLegal).toHaveBeenCalled();

    root.unmount();
  });
});
