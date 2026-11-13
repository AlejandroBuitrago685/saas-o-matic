import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { form, FormField, submit, type TreeValidationResult } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import type { CustomerResponse } from '@saas-o-matic/contract';

import type { ReadyCatalog } from '../../core/catalog/catalog.store';
import type { MessageParams } from '../../core/errors/error-messages';
import { COUNTRY_NAMES, TAX_ID_FIELD_TEXT } from '../../shared/format/country-text';
import { FieldError, isShowingError } from '../../shared/ui/field-error';
import { Spinner } from '../../shared/ui/spinner';
import { CustomerCreateApi } from './customer-create.api';
import { describeFailure, type FormNotice } from './customer-form.failure';
import {
  CUSTOMER_FIELDS,
  type CustomerField,
  customerFormSchema,
  type CustomerFormModel,
  INITIAL_CUSTOMER_FORM,
} from './customer-form.schema';

/** V2 form (spec 05 §3.2) with Signal Forms (ADR-011). It only renders once the catalog is ready. */
@Component({
  selector: 'app-customer-form',
  imports: [FormField, FieldError, RouterLink, Spinner],
  templateUrl: './customer-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerForm {
  readonly catalog = input.required<ReadyCatalog>();
  readonly created = output<CustomerResponse>();

  private readonly api = inject(CustomerCreateApi);
  private readonly model = signal<CustomerFormModel>({ ...INITIAL_CUSTOMER_FORM });

  protected readonly customerForm = form(
    this.model,
    customerFormSchema(() => this.catalog().response.limits),
  );
  protected readonly notice = signal<FormNotice | null>(null);
  protected readonly isShowingError = isShowingError;

  protected readonly countries = computed(() =>
    this.catalog().response.countries.map(({ code }) => ({ code, name: COUNTRY_NAMES[code] })),
  );
  protected readonly plans = computed(() => this.catalog().response.plans.map(({ code }) => code));
  protected readonly taxIdText = computed(() => TAX_ID_FIELD_TEXT[this.model().country]);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.notice.set(null);
    await submit(this.customerForm, {
      action: () => this.send(),
      onInvalid: () => {
        this.focusFirstInvalid();
      },
    });
    // Errors returned by the server are not known until the action ends (AC-73: the focus goes to the tax id).
    if (this.customerForm().invalid()) this.focusFirstInvalid();
  }

  private async send(): Promise<TreeValidationResult> {
    const { plan, ...rest } = this.model();
    if (plan === '') return undefined; // unreachable: `required` blocks the submit
    let customer: CustomerResponse;
    try {
      customer = await this.api.create({ ...rest, plan });
    } catch (error: unknown) {
      const failure = describeFailure(error, (field) => this.messageParams(field));
      this.notice.set(failure.notice);
      return failure.fieldErrors.map(({ field, code, message }) => ({
        kind: code,
        message,
        fieldTree: this.customerForm[field],
      }));
    }
    // Outside the try: a failure of whoever listens must never look like a failed creation (reviewer, P5).
    this.created.emit(customer);
    return undefined;
  }

  private messageParams(field: CustomerField): MessageParams {
    const { limits } = this.catalog().response;
    const { country } = this.model();
    switch (field) {
      case 'companyName':
        return limits.companyName;
      case 'taxId':
        return {
          ...limits.taxId,
          country: COUNTRY_NAMES[country],
          taxIdTypes: TAX_ID_FIELD_TEXT[country].label,
        };
      case 'contactEmail':
        return { field, max: limits.contactEmail.max };
      case 'country':
      case 'plan':
        return { field };
    }
  }

  private focusFirstInvalid(): void {
    const field = CUSTOMER_FIELDS.find((name) => this.customerForm[name]().invalid());
    if (field !== undefined) this.customerForm[field]().focusBoundControl();
  }
}
