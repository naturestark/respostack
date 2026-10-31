import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsibilityFormModal } from '../components/responsibilities/ResponsibilityFormModal';

describe('ResponsibilityFormModal', () => {
  it('renders modal when isOpen is true', () => {
    render(
      <ResponsibilityFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('New Responsibility')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('validates required title field and shows error message', async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn();

    render(
      <ResponsibilityFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={mockSave}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /create responsibility/i });
    await user.click(submitBtn);

    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('submits valid form data', async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();

    render(
      <ResponsibilityFormModal
        isOpen={true}
        onClose={mockClose}
        onSave={mockSave}
      />
    );

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Annual Car Inspection');

    const submitBtn = screen.getByRole('button', { name: /create responsibility/i });
    await user.click(submitBtn);

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Annual Car Inspection',
        category: 'Personal',
      })
    );
    expect(mockClose).toHaveBeenCalled();
  });
});
