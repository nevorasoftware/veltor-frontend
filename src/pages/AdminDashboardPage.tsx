import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Users,
  CreditCard,
  TrendingUp,
  LogOut,
  Sliders,
  CheckCircle2,
  FileText,
  AlertCircle,
  Camera,
  Check,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Plus,
  Search,
  Trash2,
  Edit3,
  ShoppingBag,
  Wrench,
  DollarSign,
  Calendar,
  Percent,
  Mail,
  LayoutDashboard,
  LayoutGrid,
  HardDrive,
} from 'lucide-react';
import { SECTIONS, formatUSD, formatDateSV, todayLocalISO } from '../config/branding';
import { api } from '../api/client';
import type { CollectionSettings, LateFeeType } from '../api/client';
import { CollectionSettingsPanel, LATE_FEE_LABELS } from '../components/admin/CollectionSettingsPanel';
import { formatDUI, formatNIT, isValidDUI, isValidNIT, compressAndReadFileAsBase64 } from '../utils/formatters';
import { clearSession, getUser } from '../auth/session';
import { AdminVehiclesTab } from '../components/admin/AdminVehiclesTab';
import { usePublicSettings } from '../hooks/usePublicSettings';
import { suggestedDownPayment } from '../utils/vehicles';
import { addMonths, firstDueDateForDay } from '../utils/collections';

interface UploadedDocState {
  file: File;
  fileName: string;
  fileSize: number;
  mimeType: string;
  base64: string;
  category: 'DUI_FRONT' | 'NIT' | 'DRIVER_LICENSE' | 'PAYSLIP' | 'UTILITY_BILL';
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'loans' | 'vehicles' | 'expenses' | 'settings'>('overview');
  const [loadError, setLoadError] = useState<string | null>(null);
  const { data: publicSettings, refetch: refetchSettings } = usePublicSettings();
  const [metrics, setMetrics] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Configuración de Tasa Preferencial
  const [adminMonthlyRate, setAdminMonthlyRate] = useState<number>(1.5);
  const [rateUpdating, setRateUpdating] = useState<boolean>(false);
  const [rateFeedback, setRateFeedback] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  // Correos del personal que reciben avisos (nuevo prospecto, crédito aprobado)
  const [staffEmailsInput, setStaffEmailsInput] = useState<string>('');
  const [staffEmailsSaving, setStaffEmailsSaving] = useState<boolean>(false);
  const [staffEmailsFeedback, setStaffEmailsFeedback] = useState<string | null>(null);
  const [staffEmailsError, setStaffEmailsError] = useState<string | null>(null);

  // Modal para registro de pago
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [archivingLoanId, setArchivingLoanId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(todayLocalISO());
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'BANK_DEPOSIT' | 'CHECK' | 'OTHER'>('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState('');
  const [nextInstallmentInfo, setNextInstallmentInfo] = useState<{
    number: number;
    dueDate: string;
    /** Saldo pendiente de la cuota incluida la mora */
    payment: string;
    lateFee: number;
    daysOverdue: number;
  } | null>(null);
  const [payoffTotal, setPayoffTotal] = useState<string | null>(null);

  // Acceso al portal del cliente
  const [portalAccessInfo, setPortalAccessInfo] = useState<{ loanCode: string; email: string; temporaryPassword: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [emailingLoanId, setEmailingLoanId] = useState<string | null>(null);
  const [paymentKind, setPaymentKind] = useState<'INSTALLMENT' | 'PRINCIPAL_PREPAYMENT' | 'PAYOFF'>('INSTALLMENT');
  const [prepayPolicy, setPrepayPolicy] = useState<'REDUCE_TERM' | 'REDUCE_INSTALLMENT'>('REDUCE_TERM');
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  // Modal para Gestión, Edición y Formalización de Prospectos
  const [leadModalOpen, setLeadModalOpen] = useState<boolean>(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [leadModalTab, setLeadModalTab] = useState<'info' | 'convert'>('info');

  // Campos de edición de prospecto
  const [leadFullName, setLeadFullName] = useState<string>('');
  const [leadPhone, setLeadPhone] = useState<string>('');
  const [leadEmail, setLeadEmail] = useState<string>('');
  const [leadStatus, setLeadStatus] = useState<string>('NEW');
  const [leadNotes, setLeadNotes] = useState<string>('');
  const [leadTermMonths, setLeadTermMonths] = useState<number>(36);
  const [leadDownPayment, setLeadDownPayment] = useState<number>(0);
  const [leadVehicleId, setLeadVehicleId] = useState<string>('');
  const [leadSaving, setLeadSaving] = useState<boolean>(false);
  const [leadSaveSuccess, setLeadSaveSuccess] = useState<string | null>(null);

  // Tasa de interés parametrizable por cliente al aperturar crédito
  const [leadMonthlyRate, setLeadMonthlyRate] = useState<number>(1.5);

  // Día de pago y mora del crédito (valores sugeridos desde Parámetros y Tasas)
  const [collectionSettings, setCollectionSettings] = useState<CollectionSettings | null>(null);
  const [leadPaymentDay, setLeadPaymentDay] = useState<number | ''>('');
  const [leadLateFeeType, setLeadLateFeeType] = useState<LateFeeType>('PER_DAY');
  const [leadLateFeeAmount, setLeadLateFeeAmount] = useState<number>(5);

  // Campos de Formalización a Crédito Activo
  const [leadDui, setLeadDui] = useState<string>('');
  const [leadNit, setLeadNit] = useState<string>('');
  const [leadAddress, setLeadAddress] = useState<string>('');
  const [leadEconomicActivity, setLeadEconomicActivity] = useState<string>('');
  const [leadMonthlyIncome, setLeadMonthlyIncome] = useState<number>(0);

  // 5 Documentos obligatorios para activar crédito
  const [duiDoc, setDuiDoc] = useState<UploadedDocState | null>(null);
  const [nitDoc, setNitDoc] = useState<UploadedDocState | null>(null);
  const [licenseDoc, setLicenseDoc] = useState<UploadedDocState | null>(null);
  const [incomeDoc, setIncomeDoc] = useState<UploadedDocState | null>(null);
  const [utilityDoc, setUtilityDoc] = useState<UploadedDocState | null>(null);

  const [convertingLoading, setConvertingLoading] = useState<boolean>(false);
  const [conversionSuccessMsg, setConversionSuccessMsg] = useState<string | null>(null);
  const [conversionErrorMsg, setConversionErrorMsg] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // CONTROL DE GASTOS Y CONTABILIDAD (PRODUCTOS Y SERVICIOS)
  // ---------------------------------------------------------------------------
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expensesSummary, setExpensesSummary] = useState<any>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState<boolean>(false);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);

  // Formulario de Gasto
  const [expConcept, setExpConcept] = useState<string>('');
  const [expCategoryType, setExpCategoryType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [expSubcategory, setExpSubcategory] = useState<string>('');
  const [expQuantity, setExpQuantity] = useState<number>(1);
  const [expUnitPrice, setExpUnitPrice] = useState<number>(0);
  const [expExpenseDate, setExpExpenseDate] = useState<string>(todayLocalISO());
  const [expProvider, setExpProvider] = useState<string>('');
  const [expInvoiceNumber, setExpInvoiceNumber] = useState<string>('');
  const [expPaymentMethod, setExpPaymentMethod] = useState<string>('TRANSFER');
  const [expStatus, setExpStatus] = useState<'PAID' | 'PENDING' | 'CANCELLED'>('PAID');
  const [expNotes, setExpNotes] = useState<string>('');
  const [expSaving, setExpSaving] = useState<boolean>(false);
  const [expFeedback, setExpFeedback] = useState<string | null>(null);
  const [expError, setExpError] = useState<string | null>(null);

  // Filtros de gastos
  const [expenseFilterType, setExpenseFilterType] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');
  const [expenseFilterStatus, setExpenseFilterStatus] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [expenseSearch, setExpenseSearch] = useState<string>('');

  // Modal de confirmación de eliminación
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<boolean>(false);

  const user = getUser();

  useEffect(() => {
    loadData();
    api
      .getNotificationSettings()
      .then((res) => setStaffEmailsInput((res?.staffEmails || []).join(', ')))
      .catch(() => {});
    api.getCollectionSettings().then(setCollectionSettings).catch(() => {});
  }, []);

  const lateFeeDefaultAmount = (type: LateFeeType, cfg = collectionSettings) =>
    type === 'PER_DAY' ? cfg?.lateFeePerDayAmount ?? 5 : type === 'PER_INSTALLMENT' ? cfg?.lateFeePerInstallmentAmount ?? 20 : 0;

  const changeLeadLateFeeType = (type: LateFeeType) => {
    setLeadLateFeeType(type);
    setLeadLateFeeAmount(lateFeeDefaultAmount(type));
  };

  const loadExpenses = async () => {
    const [expList, expSum] = await Promise.all([api.getExpenses(), api.getExpensesSummary()]);
    setExpenses(expList || []);
    setExpensesSummary(expSum);
  };

  const loadData = async () => {
    setLoadError(null);
    const results = await Promise.allSettled([
      api.getDashboardMetrics(),
      api.getLeads(),
      api.getLoansSummary(),
      api.getAllVehiclesAdmin(),
      loadExpenses(),
    ]);
    const [m, ld, ln, vh] = results;
    if (m.status === 'fulfilled') setMetrics(m.value);
    if (ld.status === 'fulfilled') setLeads(ld.value || []);
    if (ln.status === 'fulfilled') setLoans(ln.value || []);
    if (vh.status === 'fulfilled') setVehicles(vh.value || []);

    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (failed) setLoadError(failed.reason?.message || 'No fue posible cargar toda la información del panel.');
  };

  useEffect(() => {
    if (publicSettings?.preferentialMonthlyRate) {
      setAdminMonthlyRate(Number((publicSettings.preferentialMonthlyRate * 100).toFixed(4)));
    }
  }, [publicSettings?.preferentialMonthlyRate]);

  // Manejo de Modal y Formulario de Gastos
  const handleOpenExpenseModal = (expense?: any) => {
    setExpFeedback(null);
    setExpError(null);
    if (expense) {
      setSelectedExpense(expense);
      setExpConcept(expense.concept || '');
      setExpCategoryType(expense.categoryType || 'PRODUCT');
      setExpSubcategory(expense.subcategory || '');
      setExpQuantity(Number(expense.quantity) || 1);
      setExpUnitPrice(Number(expense.unitPrice) || 0);
      setExpExpenseDate(expense.expenseDate || todayLocalISO());
      setExpProvider(expense.provider || '');
      setExpInvoiceNumber(expense.invoiceNumber || '');
      setExpPaymentMethod(expense.paymentMethod || 'TRANSFER');
      setExpStatus(expense.status || 'PAID');
      setExpNotes(expense.notes || '');
    } else {
      setSelectedExpense(null);
      setExpConcept('');
      setExpCategoryType('PRODUCT');
      setExpSubcategory('Repuestos e Insumos');
      setExpQuantity(1);
      setExpUnitPrice(0);
      setExpExpenseDate(todayLocalISO());
      setExpProvider('');
      setExpInvoiceNumber('');
      setExpPaymentMethod('TRANSFER');
      setExpStatus('PAID');
      setExpNotes('');
    }
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expConcept.trim()) {
      setExpError('El concepto o descripción del gasto es obligatorio.');
      return;
    }
    if (expUnitPrice <= 0) {
      setExpError('El precio unitario debe ser mayor a $0.00.');
      return;
    }

    setExpSaving(true);
    setExpError(null);
    setExpFeedback(null);

    const qty = Number(expQuantity) > 0 ? Number(expQuantity) : 1;
    const unitPrice = Number(expUnitPrice);
    const calculatedAmount = Number((qty * unitPrice).toFixed(2));

    const payload = {
      concept: expConcept.trim(),
      categoryType: expCategoryType,
      subcategory: expSubcategory.trim() || undefined,
      quantity: qty,
      unitPrice,
      amount: calculatedAmount,
      expenseDate: expExpenseDate,
      provider: expProvider.trim() || undefined,
      invoiceNumber: expInvoiceNumber.trim() || undefined,
      paymentMethod: expPaymentMethod,
      status: expStatus,
      notes: expNotes.trim() || undefined,
    };

    try {
      if (selectedExpense) {
        await api.updateExpense(selectedExpense.id, payload);
        setExpFeedback('Gasto actualizado exitosamente en la contabilidad.');
      } else {
        await api.createExpense(payload);
        setExpFeedback('Nuevo gasto registrado y contabilizado exitosamente.');
      }
      await loadExpenses();

      setTimeout(() => {
        setExpenseModalOpen(false);
        setExpFeedback(null);
      }, 1200);
    } catch (err: any) {
      setExpError(err.message || 'No se pudo guardar el gasto.');
    } finally {
      setExpSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setDeletingExpense(true);
    try {
      await api.deleteExpense(id);
      await loadExpenses();
      setDeleteExpenseId(null);
    } catch (err: any) {
      setActionError(err.message || 'No se pudo eliminar el gasto.');
      setDeleteExpenseId(null);
    } finally {
      setDeletingExpense(false);
    }
  };

  const handleSaveRate = async () => {
    setRateUpdating(true);
    setRateFeedback(null);
    setRateError(null);
    try {
      const res = await api.updatePreferentialRate(adminMonthlyRate / 100);
      setRateFeedback(res?.message || `Tasa preferencial actualizada a ${adminMonthlyRate.toFixed(2)}% mensual.`);
      refetchSettings();
      setTimeout(() => setRateFeedback(null), 5000);
    } catch (err: any) {
      setRateError(err.message || 'No se pudo actualizar la tasa.');
    } finally {
      setRateUpdating(false);
    }
  };

  const handleSaveStaffEmails = async () => {
    setStaffEmailsSaving(true);
    setStaffEmailsFeedback(null);
    setStaffEmailsError(null);
    try {
      const emails = staffEmailsInput.split(/[,;\s]+/).filter(Boolean);
      const res = await api.updateStaffEmails(emails);
      setStaffEmailsInput((res?.staffEmails || []).join(', '));
      setStaffEmailsFeedback(res?.message || 'Correos de notificación actualizados.');
      setTimeout(() => setStaffEmailsFeedback(null), 5000);
    } catch (err: any) {
      setStaffEmailsError(err.message || 'No se pudieron guardar los correos.');
    } finally {
      setStaffEmailsSaving(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const openPdf = async (kind: 'schedule' | 'statement', loanId: string) => {
    setActionError(null);
    try {
      if (kind === 'schedule') await api.openLoanSchedulePdf(loanId);
      else await api.openLoanStatementPdf(loanId);
    } catch (err: any) {
      setActionError(err.message || 'No se pudo generar el PDF.');
    }
  };

  const handleEmailStatement = async (loan: any) => {
    const email = loan.customer?.email;
    if (!window.confirm(`¿Enviar el estado de cuenta del crédito ${loan.code} a ${email || 'el correo del cliente'}?`)) return;
    setActionError(null);
    setActionNotice(null);
    setEmailingLoanId(loan.id);
    try {
      const res = await api.emailLoanStatement(loan.id);
      setActionNotice(`Estado de cuenta del crédito ${loan.code} enviado a ${res.to}.`);
    } catch (err: any) {
      setActionError(err.message || 'No se pudo enviar el estado de cuenta.');
    } finally {
      setEmailingLoanId(null);
    }
  };

  // Carpeta del crédito en Google Drive: se abre si ya existe; si no, se archiva el expediente y luego se abre
  const handleDriveFolder = async (loan: any) => {
    if (loan.driveFolderId) {
      window.open(`https://drive.google.com/drive/folders/${loan.driveFolderId}`, '_blank', 'noopener');
      return;
    }
    setArchivingLoanId(loan.id);
    try {
      const res = await api.archiveLoanToDrive(loan.id);
      if (!res.enabled) {
        alert(res.message);
        return;
      }
      alert(
        `Expediente archivado en Google Drive: ${res.documentsMoved} documento(s)${res.amortizationSchedule ? ' y tabla de amortización' : ''}.` +
          (res.missingFiles?.length ? `\nNo se encontraron en el servidor: ${res.missingFiles.join(', ')}` : ''),
      );
      window.open(res.folderUrl, '_blank', 'noopener');
      loadData();
    } catch (err: any) {
      alert(err.message || 'No se pudo archivar el expediente en Google Drive.');
    } finally {
      setArchivingLoanId(null);
    }
  };

  const handleGrantPortalAccess = async (loan: any) => {
    if (!loan.customer?.id) return;
    const verb = 'habilitar o restablecer';
    if (!window.confirm(`¿Deseas ${verb} el acceso al portal para ${loan.customer.fullName}? Se generará una nueva contraseña temporal.`)) return;
    setActionError(null);
    try {
      const res = await api.grantPortalAccess(loan.customer.id);
      setPortalAccessInfo({ loanCode: loan.code, email: res.email, temporaryPassword: res.temporaryPassword });
    } catch (err: any) {
      setActionError(err.message || 'No se pudo habilitar el acceso al portal.');
    }
  };

  // Abrir modal de pago con la próxima cuota y la cotización de cancelación del motor financiero
  const openPaymentModal = async (loan: any) => {
    setSelectedLoan(loan);
    setPaymentKind('INSTALLMENT');
    setPrepayPolicy('REDUCE_TERM');
    setPaymentAmount('');
    setPaymentDate(todayLocalISO());
    setPaymentMethod('BANK_TRANSFER');
    setPaymentReference('');
    setPaymentError(null);
    setPaymentSuccessMsg(null);
    setNextInstallmentInfo(null);
    setPayoffTotal(null);
    setPaymentIdempotencyKey(crypto.randomUUID());
    setPaymentModalOpen(true);

    try {
      const [ledger, quote] = await Promise.all([api.getLoanLedger(loan.id), api.getPayoffQuote(loan.id)]);
      const next = ledger?.snapshot?.current?.installments?.find((i: any) =>
        ['PENDING', 'PARTIAL', 'OVERDUE'].includes(i.status),
      );
      if (next) {
        const lateFee = Number(next.lateInterestAccrued) - Number(next.paidLateInterest);
        const due = (Number(next.payment) - Number(next.paidPrincipal) - Number(next.paidInterest) + lateFee).toFixed(2);
        setNextInstallmentInfo({ number: next.number, dueDate: next.dueDate, payment: due, lateFee, daysOverdue: next.daysOverdue ?? 0 });
        setPaymentAmount(due);
      }
      if (quote?.total) setPayoffTotal(quote.total);
    } catch {
      // Si falla la consulta el cajero ingresa el monto manualmente
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    if (!(Number(paymentAmount) > 0)) {
      setPaymentError('Ingrese un monto mayor a cero.');
      return;
    }

    setPaymentSubmitting(true);
    setPaymentError(null);
    try {
      const res = await api.registerPayment({
        loanId: selectedLoan.id,
        amount: Number(paymentAmount).toFixed(2),
        effectiveDate: paymentDate,
        kind: paymentKind,
        policy: paymentKind === 'PRINCIPAL_PREPAYMENT' ? prepayPolicy : undefined,
        paymentMethod,
        referenceNumber: paymentReference.trim() || undefined,
        idempotencyKey: paymentIdempotencyKey,
      });

      setPaymentSuccessMsg(
        res.isDuplicate
          ? 'Este pago ya había sido registrado.'
          : `Pago ${res.payment?.code} aplicado. Nuevo saldo de capital: ${formatUSD(res.newPrincipalBalance)}`,
      );
      loadData();
      setTimeout(() => {
        setPaymentModalOpen(false);
        setPaymentSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      setPaymentError(err.message || 'No se pudo registrar el pago.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Abrir Modal de Gestión / Formalización de Prospecto
  const openLeadModal = (lead: any, defaultTab: 'info' | 'convert' = 'info') => {
    setSelectedLead(lead);
    setLeadModalTab(defaultTab);
    setLeadFullName(lead.fullName || '');
    setLeadPhone(lead.phone || '');
    setLeadEmail(lead.email || '');
    setLeadStatus(lead.status || 'NEW');
    setLeadNotes(lead.internalNotes || lead.message || '');
    setLeadTermMonths(lead.termMonths || publicSettings?.defaultTermMonths || 36);
    setLeadDownPayment(
      lead.estimatedDown !== undefined && lead.estimatedDown !== null
        ? Number(lead.estimatedDown)
        : lead.vehicle
        ? suggestedDownPayment(lead.vehicle, publicSettings)
        : 0,
    );
    setLeadVehicleId(lead.vehicleId || lead.vehicle?.id || '');
    setLeadMonthlyRate(adminMonthlyRate);
    const feeType = collectionSettings?.defaultLateFeeType ?? 'PER_DAY';
    setLeadPaymentDay(collectionSettings?.defaultPaymentDay ?? '');
    setLeadLateFeeType(feeType);
    setLeadLateFeeAmount(lateFeeDefaultAmount(feeType));
    setLeadDui('');
    setLeadNit('');
    setLeadAddress('');
    setLeadEconomicActivity('');
    setLeadMonthlyIncome(0);

    // Reset de documentos
    setDuiDoc(null);
    setNitDoc(null);
    setLicenseDoc(null);
    setIncomeDoc(null);
    setUtilityDoc(null);

    setLeadSaveSuccess(null);
    setConversionSuccessMsg(null);
    setConversionErrorMsg(null);
    setLeadModalOpen(true);
  };

  // Guardar cambios informativos del prospecto
  const handleSaveLeadInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    setLeadSaving(true);
    setLeadSaveSuccess(null);
    try {
      await api.updateLead(selectedLead.id, {
        fullName: leadFullName,
        phone: leadPhone,
        email: leadEmail,
        status: leadStatus,
        internalNotes: leadNotes,
        termMonths: leadTermMonths,
        estimatedDown: leadDownPayment,
        vehicleId: leadVehicleId || undefined,
      });

      setLeadSaveSuccess('Prospecto actualizado exitosamente.');
      loadData();
      setTimeout(() => setLeadSaveSuccess(null), 3000);
    } catch (err: any) {
      setConversionErrorMsg(err.message || 'No se pudieron guardar los cambios del prospecto.');
    } finally {
      setLeadSaving(false);
    }
  };



  // Cargar documento obligatorio con optimización de imagen automática
  const handleDocSelect = async (
    category: 'DUI_FRONT' | 'NIT' | 'DRIVER_LICENSE' | 'PAYSLIP' | 'UTILITY_BILL',
    file: File,
  ) => {
    try {
      // Optimiza fotos tomadas con el móvil a resolución HD para evitar 'Request Entity Too Large'
      const { base64, mimeType } = await compressAndReadFileAsBase64(file);
      const docObj: UploadedDocState = {
        file,
        fileName: file.name,
        fileSize: file.size,
        mimeType: mimeType || file.type || 'application/octet-stream',
        base64,
        category,
      };

      if (category === 'DUI_FRONT') setDuiDoc(docObj);
      else if (category === 'NIT') setNitDoc(docObj);
      else if (category === 'DRIVER_LICENSE') setLicenseDoc(docObj);
      else if (category === 'PAYSLIP') setIncomeDoc(docObj);
      else if (category === 'UTILITY_BILL') setUtilityDoc(docObj);

      setConversionErrorMsg(null);
    } catch (err) {
      console.error('Error al procesar archivo:', err);
    }
  };

  // Plazos permitidos por el producto financiero (en múltiplos de 12 meses, más el plazo actual)
  const termOptions = useMemo(() => {
    const min = publicSettings?.minTermMonths ?? 12;
    const max = publicSettings?.maxTermMonths ?? 72;
    const opts = new Set<number>([min, max, leadTermMonths]);
    for (let t = Math.ceil(min / 12) * 12; t <= max; t += 12) opts.add(t);
    return [...opts].filter((t) => t >= min && t <= max).sort((a, b) => a - b);
  }, [publicSettings?.minTermMonths, publicSettings?.maxTermMonths, leadTermMonths]);

  const uploadedDocsCount = [duiDoc, nitDoc, licenseDoc, incomeDoc, utilityDoc].filter(Boolean).length;

  // Formalizar Prospecto a Crédito Activo con Tasa Parametrizada por Cliente
  const handleFormalizeLead = async () => {
    if (!selectedLead) return;

    if (!leadDui || !leadNit) {
      setConversionErrorMsg('Por favor ingresa el DUI y NIT del solicitante.');
      return;
    }

    if (!isValidDUI(leadDui)) {
      setConversionErrorMsg('El DUI debe tener un formato salvadoreño válido (9 dígitos: 00000000-0).');
      return;
    }

    if (!isValidNIT(leadNit)) {
      setConversionErrorMsg(
        'El NIT debe tener un formato salvadoreño válido: homologado a DUI (00000000-0) o tradicional de 14 dígitos (0000-000000-000-0).',
      );
      return;
    }

    if (!leadVehicleId) {
      setConversionErrorMsg('Selecciona el vehículo a financiar en la pestaña de información del prospecto.');
      return;
    }

    if (!leadAddress.trim() || !leadEconomicActivity.trim() || !(leadMonthlyIncome > 0)) {
      setConversionErrorMsg('Completa la dirección, actividad económica e ingreso mensual del cliente.');
      return;
    }

    if (!duiDoc || !nitDoc || !licenseDoc || !incomeDoc || !utilityDoc) {
      setConversionErrorMsg(
        'Debes cargar obligatoriamente los 5 documentos del cliente (DUI, NIT, Licencia, Comprobante de Ingresos y Recibo de Agua o Luz) para activar el crédito.',
      );
      return;
    }

    setConvertingLoading(true);
    setConversionErrorMsg(null);
    setConversionSuccessMsg(null);

    try {
      const documentsPayload = [duiDoc, nitDoc, licenseDoc, incomeDoc, utilityDoc].map((d) => ({
        category: d.category,
        fileName: d.fileName,
        mimeType: d.mimeType,
        contentBase64: d.base64,
      }));

      const res = await api.convertLeadToLoan(selectedLead.id, {
        dui: leadDui,
        nit: leadNit,
        address: leadAddress.trim(),
        economicActivity: leadEconomicActivity.trim(),
        monthlyIncome: leadMonthlyIncome,
        vehicleId: leadVehicleId,
        downPayment: leadDownPayment,
        termMonths: leadTermMonths,
        monthlyRate: leadMonthlyRate / 100,
        paymentDay: leadPaymentDay === '' ? undefined : leadPaymentDay,
        lateFeeType: leadLateFeeType,
        lateFeeAmount: leadLateFeeType === 'NONE' ? undefined : leadLateFeeAmount,
        documents: documentsPayload,
      });

      setConversionSuccessMsg(
        `${res.message} Cuota nivelada: ${formatUSD(res.levelPayment)} a ${leadTermMonths} meses (${leadMonthlyRate.toFixed(2)}% mensual).`,
      );
      loadData();
    } catch (err: any) {
      setConversionErrorMsg(err.message || 'No se pudo formalizar el crédito.');
    } finally {
      setConvertingLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Barra Superior de Administración */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {SECTIONS.adminPanel}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Panel de Operaciones Financieras
          </h1>
          <p className="text-xs text-slate-400">
            Sesión activa: <span className="text-slate-200 font-semibold">{user?.fullName}</span> ({user?.role})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Menú de Módulos del Panel */}
      <nav aria-label="Menú de administración" className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-2 shadow-lg">
        <div className="flex items-center gap-2 px-2 pt-1 pb-2">
          <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Menú de administración</span>
        </div>
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
          {([
            { key: 'overview', label: 'Resumen General', icon: LayoutDashboard },
            { key: 'leads', label: 'Prospectos', icon: Users, count: leads.length },
            { key: 'loans', label: SECTIONS.loans, icon: CreditCard },
            { key: 'vehicles', label: 'Vehículos', icon: Car, count: vehicles.length },
            { key: 'expenses', label: 'Control de Gastos', icon: Receipt, count: expenses.length },
            { key: 'settings', label: 'Parámetros y Tasas', icon: Sliders },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                  active
                    ? 'bg-sky-500/15 border-sky-400/50 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.15)]'
                    : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {'count' in tab && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      active ? 'bg-sky-400/20 text-sky-200' : 'bg-slate-700/70 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {(loadError || actionError) && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {actionError || loadError}
          </span>
          <button
            onClick={() => {
              setActionError(null);
              if (loadError) loadData();
            }}
            className="text-rose-200 hover:text-white font-semibold cursor-pointer"
          >
            {actionError ? 'Cerrar' : 'Reintentar'}
          </button>
        </div>
      )}

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {actionNotice}
          </span>
          <button onClick={() => setActionNotice(null)} className="text-emerald-200 hover:text-white font-semibold cursor-pointer">
            Cerrar
          </button>
        </div>
      )}

      {/* Tarjetas de Métricas en Vivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl glass-panel border border-slate-700/80 bg-[#0F172A]/90 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Cartera Vigente</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {metrics ? formatUSD(metrics.financial.activePortfolio) : '-'}
          </div>
          <p className="text-[11px] text-slate-400">
            Capital activo en {metrics?.financial?.activeLoans || 0} financiamientos
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-slate-700/80 bg-[#0F172A]/90 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Cobranza del Mes</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {metrics ? formatUSD(metrics.financial.monthCollections) : '-'}
          </div>
          <p className="text-[11px] text-slate-400">
            Recaudación acumulada del mes en curso
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-slate-700/80 bg-[#0F172A]/90 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Prospectos Nuevos</span>
            <Users className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-2xl font-black text-white">
            {metrics?.commercial?.pendingLeads ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">
            Solicitudes pendientes de contacto
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-slate-700/80 bg-[#0F172A]/90 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Vehículos Disponibles</span>
            <Car className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-2xl font-black text-white">
            {metrics?.vehicles?.available || 0}
          </div>
          <p className="text-[11px] text-slate-400">
            {metrics?.vehicles?.reserved || 0} reservados · {metrics?.vehicles?.sold || 0} vendidos
          </p>
        </div>
      </div>

      {/* Contenido según pestaña */}
      {activeTab === 'vehicles' && <AdminVehiclesTab vehicles={vehicles} onChanged={loadData} />}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Últimos Prospectos */}
          <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-700/80 bg-[#0F172A]/90 p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Solicitudes de Financiamiento Recientes
              </h3>
              <button
                onClick={() => setActiveTab('leads')}
                className="text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Ver todos
              </button>
            </div>

            <div className="space-y-3">
              {leads.slice(0, 4).map((l) => (
                <div
                  key={l.id}
                  className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{l.fullName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        l.status === 'CONVERTED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {l.status === 'CONVERTED' ? 'Crédito Activo' : l.status}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-0.5">
                      {l.phone} · {l.email}
                    </p>
                    {l.vehicle && (
                      <p className="text-slate-300 font-medium mt-1">
                        Vehículo: {l.vehicle.brand} {l.vehicle.model}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {l.code}
                    </span>
                    <button
                      onClick={() => openLeadModal(l)}
                      className="mt-1 px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs cursor-pointer"
                    >
                      Gestionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cartera Activa y Registro Rápido de Cobros */}
          <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-700/80 bg-[#0F172A]/90 p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {SECTIONS.loans} Activos
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {loans.length} créditos
              </span>
            </div>

            <div className="space-y-3">
              {loans.map((ln) => (
                <div
                  key={ln.id}
                  className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-white">{ln.code}</span>
                      <p className="text-slate-300 font-semibold">{ln.customer.fullName}</p>
                      <p className="text-slate-400">{ln.vehicle.brand} {ln.vehicle.model} ({ln.vehicle.year})</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      {ln.status}
                    </span>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Saldo a la Fecha</span>
                      <span className="font-bold text-white font-mono text-sm">
                        {formatUSD(ln.currentPrincipalBalance)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Tasa Mensual</span>
                      <span className="font-bold text-slate-300 font-mono">
                        {(Number(ln.monthlyRate) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <button
                    disabled={ln.status !== 'ACTIVE'}
                    onClick={() => openPaymentModal(ln)}
                    className="w-full py-2 rounded-lg bg-slate-100 hover:bg-white text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Registrar Pago o Abono
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pestaña: Gestión de Prospectos (Leads) */}
      {activeTab === 'leads' && (
        <div className="glass-panel rounded-2xl border border-slate-700/80 bg-[#0F172A]/90 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">Pipeline de Prospectos Comerciales</h3>
              <p className="text-xs text-slate-400">
                Edita prospectos, actualiza su estado o formalízalos a crédito activo cargando sus 4 documentos obligatorios
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-slate-200 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Prospecto</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4">Vehículo de Interés</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-300">{l.code}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">{l.fullName}</td>
                    <td className="py-3.5 px-4">
                      <div>{l.phone}</div>
                      <div className="text-slate-400 text-[11px]">{l.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {l.vehicle ? `${l.vehicle.brand} ${l.vehicle.model}` : 'Interés general'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          l.status === 'CONVERTED'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : l.status === 'IN_EVALUATION'
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            : l.status === 'CONTACTED'
                            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {l.status === 'CONVERTED' ? 'Crédito Activo' : l.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {formatDateSV(l.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openLeadModal(l, 'info')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                        >
                          Editar / Estado
                        </button>
                        {l.status !== 'CONVERTED' && (
                          <button
                            onClick={() => openLeadModal(l, 'convert')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow flex items-center gap-1 cursor-pointer"
                          >
                            <span>Activar Crédito</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pestaña: Créditos y Amortización */}
      {activeTab === 'loans' && (
        <div className="glass-panel rounded-2xl border border-slate-700/80 bg-[#0F172A]/90 p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">{SECTIONS.loans}</h3>
              <p className="text-xs text-slate-400">Control de créditos formalizados, saldos a la fecha y tablas de amortización</p>
            </div>
          </div>

          {portalAccessInfo && (
            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-100 space-y-1">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-bold">Acceso al portal habilitado ({portalAccessInfo.loanCode})</p>
                  <p>
                    Usuario: <span className="font-mono">{portalAccessInfo.email}</span>
                  </p>
                  <p>
                    Contraseña temporal: <span className="font-mono font-bold select-all">{portalAccessInfo.temporaryPassword}</span>
                  </p>
                  <p className="text-sky-300/80">Entrégala al cliente por un canal seguro. Se mostrará solo esta vez y se le pedirá cambiarla al ingresar.</p>
                </div>
                <button onClick={() => setPortalAccessInfo(null)} className="text-sky-300 hover:text-white cursor-pointer">
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {loans.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-10">
                Aún no hay créditos formalizados. Se crean al activar un prospecto con su expediente completo.
              </p>
            )}
            {loans.map((ln) => (
              <div
                key={ln.id}
                className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-black text-white">{ln.code}</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      {ln.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-200">
                    {ln.customer.fullName}
                    {ln.customer.dui ? ` · DUI: ${ln.customer.dui}` : ''}
                  </p>
                  <p className="text-xs text-slate-400">
                    Garantía: {ln.vehicle.brand} {ln.vehicle.model} ({ln.vehicle.year}) · Plazo: {ln.termCount} meses
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-700">
                  <div>
                    <span className="text-slate-400 block font-semibold">Monto Original</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {formatUSD(ln.originalPrincipal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Saldo a la Fecha</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {formatUSD(ln.currentPrincipalBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Tasa Mensual</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {(Number(ln.monthlyRate) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Pago y Mora</span>
                    <span className="font-mono font-bold text-white text-sm">
                      Día {ln.paymentDay ?? Number(String(ln.firstDueDate).slice(8, 10))}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {ln.lateFeeType === 'PER_DAY'
                        ? `${formatUSD(ln.lateFeeAmount)} por día`
                        : ln.lateFeeType === 'PER_INSTALLMENT'
                        ? `${formatUSD(ln.lateFeeAmount)} por cuota`
                        : ln.lateRateMonthly
                        ? `${(Number(ln.lateRateMonthly) * 100).toFixed(2)}% mensual`
                        : 'Sin mora'}
                      {' · '}gracia {ln.graceDays} d
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    onClick={() => openPdf('schedule', ln.id)}
                    className="w-full sm:w-auto p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title="Descargar Tabla de Amortización Oficial en PDF"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-300" />
                    <span>Amortización PDF</span>
                  </button>
                  <button
                    onClick={() => openPdf('statement', ln.id)}
                    className="w-full sm:w-auto p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title="Descargar Estado de Cuenta Oficial en PDF"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Estado Cuenta PDF</span>
                  </button>
                  <button
                    disabled={emailingLoanId === ln.id}
                    onClick={() => handleEmailStatement(ln)}
                    className="w-full sm:w-auto p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    title="Enviar el Estado de Cuenta en PDF al correo del cliente"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{emailingLoanId === ln.id ? 'Enviando...' : 'Enviar por correo'}</span>
                  </button>
                  <button
                    onClick={() => handleGrantPortalAccess(ln)}
                    className="w-full sm:w-auto p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title="Crear o restablecer el acceso del cliente al portal"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />
                    <span>Acceso al portal</span>
                  </button>
                  <button
                    disabled={archivingLoanId === ln.id}
                    onClick={() => handleDriveFolder(ln)}
                    className="w-full sm:w-auto p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    title={ln.driveFolderId ? 'Abrir la carpeta del crédito en Google Drive' : 'Archivar el expediente del crédito en Google Drive'}
                  >
                    <HardDrive className="w-3.5 h-3.5 text-amber-300" />
                    <span>{archivingLoanId === ln.id ? 'Archivando...' : ln.driveFolderId ? 'Carpeta Drive' : 'Archivar en Drive'}</span>
                  </button>
                  <button
                    disabled={ln.status !== 'ACTIVE'}
                    onClick={() => openPaymentModal(ln)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-white text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Registrar Pago / Abono
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pestaña: Parámetros y Tasas */}
      {activeTab === 'settings' && (
        <div className="glass-panel rounded-2xl border border-slate-700/80 bg-[#0F172A]/90 p-6 sm:p-8 space-y-6 max-w-3xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-slate-300" />
                <span>Parametrización de Tasa Preferencial</span>
              </h3>
              <p className="text-xs text-slate-400">
                Esta tasa se aplica en tiempo real al simulador de financiamiento público y a las cotizaciones del catálogo.
              </p>
            </div>
          </div>

          {rateFeedback && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{rateFeedback}</span>
            </div>
          )}
          {rateError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{rateError}</span>
            </div>
          )}

          <div className="space-y-6 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60">
            {/* Tasa Mensual */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Tasa de Interés Mensual Preferencial
                </label>
                <div className="relative flex items-center w-36">
                  <input
                    type="number"
                    min={0.1}
                    max={5.0}
                    step={0.05}
                    value={adminMonthlyRate}
                    onChange={(e) => setAdminMonthlyRate(Math.max(0.1, Number(e.target.value)))}
                    className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-600 focus:border-white focus:ring-1 focus:ring-white rounded-xl text-right font-mono font-bold text-base text-white outline-none"
                  />
                  <span className="absolute right-3 text-slate-400 font-bold text-sm">%</span>
                </div>
              </div>

              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.05}
                value={adminMonthlyRate}
                onChange={(e) => setAdminMonthlyRate(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-white"
              />

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>0.50% (Mínima)</span>
                <span>1.50% (Estándar de mercado)</span>
                <span>3.00%</span>
              </div>
            </div>

            {/* Presets rápidos */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Tasas rápidas:</span>
              {[1.20, 1.35, 1.50, 1.75, 2.00].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAdminMonthlyRate(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    adminMonthlyRate === r
                      ? 'bg-slate-100 text-slate-950 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {r.toFixed(2)}%
                </button>
              ))}
            </div>

            {/* Equivalencias Anuales */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-sans">Tasa Nominal Anual</span>
                <span className="text-lg font-black text-white">
                  {(adminMonthlyRate * 12).toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-sans">Tasa Efectiva Anual (TEA)</span>
                <span className="text-lg font-black text-emerald-400">
                  {((Math.pow(1 + adminMonthlyRate / 100, 12) - 1) * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveRate}
                disabled={rateUpdating}
                className="w-full py-3.5 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-white text-slate-950 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{rateUpdating ? 'Guardando en Base de Datos...' : 'Guardar Nueva Tasa en Producción'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Correos de notificación al personal */}
          <div className="space-y-4 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-300" />
                <span>Correos de Notificación al Personal</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Reciben un aviso cada vez que se registra un nuevo prospecto y cuando se aprueba un crédito. Separe varios correos con comas.
              </p>
            </div>

            {staffEmailsFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{staffEmailsFeedback}</span>
              </div>
            )}
            {staffEmailsError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffEmailsError}</span>
              </div>
            )}

            <textarea
              rows={2}
              value={staffEmailsInput}
              onChange={(e) => setStaffEmailsInput(e.target.value)}
              placeholder="admin@empresa.com, ventas@empresa.com"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 focus:border-white focus:ring-1 focus:ring-white rounded-xl text-sm font-mono text-white outline-none resize-none"
            />

            <button
              type="button"
              onClick={handleSaveStaffEmails}
              disabled={staffEmailsSaving}
              className="w-full py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-white text-slate-950 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{staffEmailsSaving ? 'Guardando...' : 'Guardar Correos de Notificación'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>

          <CollectionSettingsPanel />
        </div>
      )}

      {/* VISTA: CONTROL DE GASTOS Y CONTABILIDAD (PRODUCTOS Y SERVICIOS) */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Cabecera de la sección de gastos */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl glass-panel border border-slate-700/80 bg-[#0F172A]/90">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400">
                <Receipt className="w-4 h-4" />
                <span>Módulo Contable de Egresos</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Control de Gastos por Productos y Servicios
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
                Administración integral de salidas financieras, adquisiciones de inventario, consumibles y contratación de servicios especializados para el balance contable del sistema.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenExpenseModal()}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Nuevo Gasto</span>
              </button>
            </div>
          </div>

          {/* Tarjetas KPI Contables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total General */}
            <div className="p-5 rounded-2xl glass-panel border border-slate-700/80 bg-[#0F172A]/80 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Total Acumulado</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {formatUSD(expensesSummary?.totalAmount || '0.00')}
              </div>
              <p className="text-[11px] text-slate-400">
                {expensesSummary?.totalCount || expenses.length} registros contables
              </p>
            </div>

            {/* Total Productos */}
            <div className="p-5 rounded-2xl glass-panel border border-emerald-500/20 bg-emerald-950/10 space-y-2">
              <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>En Productos</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 font-bold font-mono">
                  {expensesSummary?.productsCount || 0}
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-300 font-mono">
                {formatUSD(expensesSummary?.productsTotal || '0.00')}
              </div>
              <p className="text-[11px] text-emerald-400/80">
                Repuestos, llantas y suministros
              </p>
            </div>

            {/* Total Servicios */}
            <div className="p-5 rounded-2xl glass-panel border border-sky-500/20 bg-sky-950/10 space-y-2">
              <div className="flex items-center justify-between text-sky-400 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>En Servicios</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 font-bold font-mono">
                  {expensesSummary?.servicesCount || 0}
                </span>
              </div>
              <div className="text-2xl font-black text-sky-300 font-mono">
                {formatUSD(expensesSummary?.servicesTotal || '0.00')}
              </div>
              <p className="text-[11px] text-sky-400/80">
                Mantenimientos, avalúos y pólizas
              </p>
            </div>

            {/* Mes Actual */}
            <div className="p-5 rounded-2xl glass-panel border border-slate-700/80 bg-[#0F172A]/80 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mes en Curso</span>
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {formatUSD(expensesSummary?.currentMonthTotal || '0.00')}
              </div>
              <p className="text-[11px] text-slate-400">
                Egresos operativos del mes
              </p>
            </div>

            {/* Pendientes de Pago */}
            <div className="p-5 rounded-2xl glass-panel border border-amber-500/20 bg-amber-950/10 space-y-2">
              <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Por Pagar</span>
                </span>
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono">
                {formatUSD(expensesSummary?.pendingTotal || '0.00')}
              </div>
              <p className="text-[11px] text-amber-400/80">
                Cuentas por liquidar
              </p>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-700/80 bg-[#0F172A]/80">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                placeholder="Buscar por concepto, subcategoría, proveedor, N° de factura o código..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400 transition-colors"
              />
              {expenseSearch && (
                <button
                  type="button"
                  onClick={() => setExpenseSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtros de Tipo y Estado */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Filtro Tipo */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setExpenseFilterType('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    expenseFilterType === 'ALL'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseFilterType('PRODUCT')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    expenseFilterType === 'PRODUCT'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShoppingBag className="w-3 h-3" />
                  <span>Productos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseFilterType('SERVICE')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    expenseFilterType === 'SERVICE'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Wrench className="w-3 h-3" />
                  <span>Servicios</span>
                </button>
              </div>

              {/* Filtro Estado */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setExpenseFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    expenseFilterStatus === 'ALL'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Estados
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseFilterStatus('PAID')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    expenseFilterStatus === 'PAID'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pagados
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseFilterStatus('PENDING')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    expenseFilterStatus === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pendientes
                </button>
              </div>
            </div>
          </div>

          {/* Tabla Contable de Gastos */}
          <div className="overflow-hidden rounded-3xl glass-panel border border-slate-700/80 bg-[#0F172A]/90 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-4 px-4 sm:px-6">Código / Fecha</th>
                    <th className="py-4 px-4">Clasificación</th>
                    <th className="py-4 px-4">Concepto y Subcategoría</th>
                    <th className="py-4 px-4">Proveedor / Comprobante</th>
                    <th className="py-4 px-4 text-center">Cant. × P. Unit.</th>
                    <th className="py-4 px-4 text-right">Monto Total</th>
                    <th className="py-4 px-4 text-center">Estado</th>
                    <th className="py-4 px-4 sm:px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {expenses
                    .filter((item) => {
                      const matchType = expenseFilterType === 'ALL' || item.categoryType === expenseFilterType;
                      const matchStatus = expenseFilterStatus === 'ALL' || item.status === expenseFilterStatus;
                      const searchLower = expenseSearch.toLowerCase().trim();
                      const matchSearch =
                        !searchLower ||
                        (item.concept || '').toLowerCase().includes(searchLower) ||
                        (item.provider || '').toLowerCase().includes(searchLower) ||
                        (item.invoiceNumber || '').toLowerCase().includes(searchLower) ||
                        (item.code || '').toLowerCase().includes(searchLower) ||
                        (item.subcategory || '').toLowerCase().includes(searchLower);
                      return matchType && matchStatus && matchSearch;
                    })
                    .map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Código y Fecha */}
                        <td className="py-4 px-4 sm:px-6 font-mono">
                          <span className="font-bold text-slate-200 block text-xs">
                            {exp.code}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {exp.expenseDate ? formatDateSV(exp.expenseDate) : 'Fecha N/D'}
                          </span>
                        </td>

                        {/* Clasificación Producto o Servicio */}
                        <td className="py-4 px-4">
                          {exp.categoryType === 'PRODUCT' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <ShoppingBag className="w-3 h-3" />
                              <span>Producto</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30">
                              <Wrench className="w-3 h-3" />
                              <span>Servicio</span>
                            </span>
                          )}
                        </td>

                        {/* Concepto y Subcategoría */}
                        <td className="py-4 px-4 max-w-xs">
                          <span className="font-bold text-white block truncate text-xs">
                            {exp.concept}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {exp.subcategory && (
                              <span className="text-[10px] text-amber-400/90 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                                {exp.subcategory}
                              </span>
                            )}
                            {exp.notes && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                {exp.notes}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Proveedor y Factura */}
                        <td className="py-4 px-4">
                          <span className="text-slate-200 font-medium block truncate max-w-[180px]">
                            {exp.provider || 'Proveedor General'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {exp.invoiceNumber ? `Doc: ${exp.invoiceNumber}` : 'Sin comprobante'}
                          </span>
                        </td>

                        {/* Cantidad x Precio Unitario */}
                        <td className="py-4 px-4 text-center font-mono text-slate-300">
                          <span>{exp.quantity || 1} × {formatUSD(exp.unitPrice || 0)}</span>
                        </td>

                        {/* Monto Total */}
                        <td className="py-4 px-4 text-right font-mono font-black text-white text-sm">
                          {formatUSD(exp.amount || 0)}
                        </td>

                        {/* Estado */}
                        <td className="py-4 px-4 text-center">
                          {exp.status === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pagado</span>
                            </span>
                          ) : exp.status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <AlertCircle className="w-3 h-3" />
                              <span>Pendiente</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              <span>Anulado</span>
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenExpenseModal(exp)}
                              title="Editar Gasto"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteExpenseId(exp.id)}
                              title="Eliminar Gasto"
                              className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {expenses.filter((item) => {
                    const matchType = expenseFilterType === 'ALL' || item.categoryType === expenseFilterType;
                    const matchStatus = expenseFilterStatus === 'ALL' || item.status === expenseFilterStatus;
                    const searchLower = expenseSearch.toLowerCase().trim();
                    const matchSearch =
                      !searchLower ||
                      (item.concept || '').toLowerCase().includes(searchLower) ||
                      (item.provider || '').toLowerCase().includes(searchLower) ||
                      (item.invoiceNumber || '').toLowerCase().includes(searchLower) ||
                      (item.code || '').toLowerCase().includes(searchLower) ||
                      (item.subcategory || '').toLowerCase().includes(searchLower);
                    return matchType && matchStatus && matchSearch;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                        <p className="font-semibold text-slate-300 text-sm">
                          No se encontraron registros de gastos
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {expenseSearch
                            ? 'Prueba modificando los términos de búsqueda o filtros aplicados.'
                            : 'Comienza agregando el primer gasto operativo para la contabilidad.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenExpenseModal()}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Registrar Primer Gasto</span>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INTEGRAL: GESTIÓN DE PROSPECTO Y FORMALIZACIÓN A CRÉDITO ACTIVO */}
      {leadModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl glass-panel rounded-3xl border border-slate-700 bg-[#0F172A] p-6 sm:p-8 shadow-2xl my-6 text-slate-100 space-y-6">
            <button
              onClick={() => setLeadModalOpen(false)}
              className="absolute top-5 right-5 z-10 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
            >
              ✕
            </button>

            {/* Cabecera del Modal */}
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Gestión y Expediente de Prospecto · {selectedLead.code}
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                {selectedLead.fullName}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedLead.phone} · {selectedLead.email}
              </p>
            </div>

            {/* Selector de Modos / Pestañas del Modal */}
            <div className="flex border-b border-slate-800 text-xs font-bold gap-6">
              <button
                type="button"
                onClick={() => setLeadModalTab('info')}
                className={`pb-3 border-b-2 transition-all cursor-pointer ${
                  leadModalTab === 'info'
                    ? 'border-white text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Editar Datos y Seguimiento
              </button>
              <button
                type="button"
                onClick={() => setLeadModalTab('convert')}
                className={`pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  leadModalTab === 'convert'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-emerald-300'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>2. Formalizar a Crédito Activo (5 Documentos)</span>
                {uploadedDocsCount === 5 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                    5/5
                  </span>
                )}
              </button>
            </div>

            {/* PESTAÑA 1: EDITAR DATOS Y SEGUIMIENTO DEL PROSPECTO */}
            {leadModalTab === 'info' && (
              <form onSubmit={handleSaveLeadInfo} className="space-y-5">
                {leadSaveSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{leadSaveSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={leadFullName}
                      onChange={(e) => setLeadFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Teléfono Móvil *</label>
                    <input
                      type="text"
                      required
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Estado de Seguimiento *</label>
                    <select
                      value={leadStatus}
                      onChange={(e) => setLeadStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-white font-semibold"
                    >
                      <option value="NEW">NUEVO (Sin Contactar)</option>
                      <option value="CONTACTED">CONTACTADO (En Seguimiento)</option>
                      <option value="IN_EVALUATION">EN EVALUACIÓN (Validando Capacidad)</option>
                      <option value="DISCARDED">DESCARTADO (No Califica)</option>
                      <option value="CONVERTED">CONVERTIDO (Formalizado a Crédito)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Vehículo de Interés</label>
                    <select
                      value={leadVehicleId}
                      onChange={(e) => setLeadVehicleId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-white"
                    >
                      <option value="">Seleccionar vehículo...</option>
                      {vehicles
                        .filter((v) => v.status === 'AVAILABLE' || v.status === 'RESERVED' || v.id === leadVehicleId)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.code} · {v.brand} {v.model} ({v.year}) - {formatUSD(v.salePrice)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Plazo de Meses (Personalizado)</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={leadTermMonths}
                        onChange={(e) => setLeadTermMonths(Number(e.target.value))}
                        className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm outline-none focus:border-white"
                      />
                      <span className="absolute right-3 text-slate-400 text-xs">meses</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Prima Acordada ($)</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-slate-400 font-bold text-xs">$</span>
                      <input
                        type="number"
                        min={0}
                        value={leadDownPayment}
                        onChange={(e) => setLeadDownPayment(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm outline-none focus:border-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Notas de Seguimiento Comercial</label>
                  <textarea
                    rows={3}
                    value={leadNotes}
                    onChange={(e) => setLeadNotes(e.target.value)}
                    placeholder="Detalles sobre llamadas, preferencias del cliente o acuerdos preliminares..."
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-white resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={leadSaving}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700 cursor-pointer"
                  >
                    {leadSaving ? 'Guardando...' : 'Guardar Cambios de Prospecto'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeadModalTab('convert')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Formalizar a Crédito Activo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* PESTAÑA 2: FORMALIZAR A CRÉDITO ACTIVO (CARGA DE 5 DOCUMENTOS OBLIGATORIOS) */}
            {leadModalTab === 'convert' && (
              <div className="space-y-6">
                {conversionSuccessMsg ? (
                  <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">¡Crédito Formalizado y Activado!</h3>
                      <p className="text-xs text-slate-300 mt-1">{conversionSuccessMsg}</p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          setLeadModalOpen(false);
                          setActiveTab('loans');
                        }}
                        className="px-6 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider shadow cursor-pointer"
                      >
                        Ver en Cartera de Créditos
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                        Requisito Obligatorio de Expediente
                      </span>
                      <p className="text-xs text-slate-300">
                        Para pasar de prospecto a <strong>Crédito Activo</strong> se deben ingresar los datos fiscales y cargar desde tu PC o Móvil los <strong>5 documentos requeridos</strong>: DUI, NIT, Licencia de Conducir, Comprobante de Ingresos y Recibo de Agua o Luz.
                      </p>
                    </div>

                    {conversionErrorMsg && (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{conversionErrorMsg}</span>
                      </div>
                    )}

                    {/* SECCIÓN: CONDICIONES FINANCIERAS Y TASA PERSONALIZADA POR CLIENTE */}
                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-lg space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <Percent className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">
                              Tasa y Condiciones Calculadas por Cliente
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Parametriza la tasa de interés mensual de este cliente al aperturar el crédito.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setLeadMonthlyRate(adminMonthlyRate)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                          >
                            Usar Tasa Oficial ({adminMonthlyRate.toFixed(2)}%)
                          </button>
                        </div>
                      </div>

                      {/* Parámetros: Tasa, Plazo y Prima */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        {/* Selector y Ajuste de Tasa Mensual */}
                        <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                          <div className="flex items-center justify-between">
                            <label className="text-slate-300 font-semibold">Tasa Mensual Aplicada *</label>
                            <span className="font-mono font-black text-emerald-400 text-sm">
                              {leadMonthlyRate.toFixed(2)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="3.5"
                            step="0.05"
                            value={leadMonthlyRate}
                            onChange={(e) => setLeadMonthlyRate(Number(e.target.value))}
                            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                          />
                          {/* Chips de tasa rápida */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {[0.99, 1.25, 1.5, 1.75, 2.0].map((rateVal) => (
                              <button
                                key={rateVal}
                                type="button"
                                onClick={() => setLeadMonthlyRate(rateVal)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                  Math.abs(leadMonthlyRate - rateVal) < 0.01
                                    ? 'bg-emerald-500 text-slate-950 font-black'
                                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                                }`}
                              >
                                {rateVal.toFixed(2)}%
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1">
                            <span>Nominal Anual: {(leadMonthlyRate * 12).toFixed(1)}%</span>
                            <span>TEA: {((Math.pow(1 + leadMonthlyRate / 100, 12) - 1) * 100).toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* Plazo en Meses */}
                        <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                          <label className="block text-slate-300 font-semibold">Plazo del Financiamiento *</label>
                          <select
                            value={leadTermMonths}
                            onChange={(e) => setLeadTermMonths(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-white"
                          >
                            {termOptions.map((t) => (
                              <option key={t} value={t}>
                                {t} meses
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1.5 pt-1">
                            {[24, 36, 48, 60].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setLeadTermMonths(t)}
                                className={`flex-1 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                  leadTermMonths === t
                                    ? 'bg-slate-200 text-slate-950'
                                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                                }`}
                              >
                                {t}m
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            Amortización según sistema francés con cuotas fijas mensuales.
                          </p>
                        </div>

                        {/* Prima Acordada */}
                        <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                          <div className="flex items-center justify-between">
                            <label className="text-slate-300 font-semibold">Prima / Enganche ($) *</label>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Min: 15%
                            </span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={leadDownPayment}
                            onChange={(e) => setLeadDownPayment(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-white"
                          />
                          <p className="text-[10px] text-slate-500">
                            Precio unidad: {formatUSD(selectedLead.vehicle?.salePrice || 20000)}
                          </p>
                        </div>
                      </div>

                      {/* Día de pago y mora del crédito */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                          <label className="block text-slate-300 font-semibold">Día de Pago Mensual</label>
                          <input
                            type="number"
                            min="1"
                            max="28"
                            value={leadPaymentDay}
                            placeholder={`Mismo día del desembolso (${Number(todayLocalISO().slice(8, 10))})`}
                            onChange={(e) =>
                              setLeadPaymentDay(e.target.value === '' ? '' : Math.min(28, Math.max(1, Number(e.target.value))))
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-white"
                          />
                          <p className="text-[10px] text-slate-500">
                            Primera cuota:{' '}
                            {formatDateSV(
                              leadPaymentDay === ''
                                ? addMonths(todayLocalISO(), 1)
                                : firstDueDateForDay(todayLocalISO(), leadPaymentDay),
                            )}
                            {leadPaymentDay !== '' && ` · luego el ${leadPaymentDay} de cada mes`}
                          </p>
                        </div>

                        <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                          <label className="block text-slate-300 font-semibold">Tipo de Mora</label>
                          <select
                            value={leadLateFeeType}
                            onChange={(e) => changeLeadLateFeeType(e.target.value as LateFeeType)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-white"
                          >
                            {(Object.keys(LATE_FEE_LABELS) as LateFeeType[]).map((k) => (
                              <option key={k} value={k}>
                                {LATE_FEE_LABELS[k]}
                              </option>
                            ))}
                          </select>
                          <p className="text-[10px] text-slate-500">
                            Se cobra después de {collectionSettings?.graceDays ?? 5} día(s) de gracia.
                          </p>
                        </div>

                        <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                          <label className="block text-slate-300 font-semibold">
                            {leadLateFeeType === 'PER_DAY' ? 'Mora por Día ($)' : 'Cuota de Mora ($)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={leadLateFeeType === 'NONE'}
                            value={leadLateFeeType === 'NONE' ? '' : leadLateFeeAmount}
                            onChange={(e) => setLeadLateFeeAmount(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs outline-none focus:border-white disabled:opacity-40"
                          />
                          <p className="text-[10px] text-slate-500">
                            {leadLateFeeType === 'PER_DAY'
                              ? 'Se suma por cada día de atraso hasta que se registre el pago.'
                              : leadLateFeeType === 'PER_INSTALLMENT'
                              ? 'Se suma una vez a cada cuota vencida.'
                              : 'El crédito no generará recargos por atraso.'}
                          </p>
                        </div>
                      </div>

                      {/* Proyección y Resumen Financiero en Vivo */}
                      {(() => {
                        const vehiclePrice = Number(selectedLead.vehicle?.salePrice || 20000);
                        const principal = Math.max(100, vehiclePrice - leadDownPayment);
                        const i = leadMonthlyRate / 100;
                        const n = leadTermMonths || 36;
                        const cuota = i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
                        const totalFinanciamiento = cuota * n;
                        const totalIntereses = totalFinanciamiento - principal;

                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 font-mono text-xs">
                            <div>
                              <span className="text-[10px] uppercase text-slate-400 font-sans block">Capital a Financiar</span>
                              <span className="text-sm font-bold text-white">{formatUSD(principal)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-emerald-400 font-sans block font-bold">Cuota Mensual Nivelada</span>
                              <span className="text-base font-black text-emerald-400">{formatUSD(cuota)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-slate-400 font-sans block">Intereses Proyectados</span>
                              <span className="text-sm font-bold text-slate-300">{formatUSD(totalIntereses)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase text-slate-400 font-sans block">Total a Pagar ({n} meses)</span>
                              <span className="text-sm font-bold text-white">{formatUSD(totalFinanciamiento)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Datos fiscales y contractuales del cliente */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-300 font-semibold">DUI del Solicitante *</label>
                          {leadDui && (
                            <span
                              className={`text-[10px] font-bold ${
                                isValidDUI(leadDui) ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {isValidDUI(leadDui) ? '✓ Válido' : 'Formato incompleto'}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={leadDui}
                          onChange={(e) => setLeadDui(formatDUI(e.target.value))}
                          placeholder="00000000-0"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono outline-none focus:border-white transition-all"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Formato: 00000000-0 (8 dígitos y 1 de control)</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-300 font-semibold">NIT del Solicitante *</label>
                          {leadNit && (
                            <span
                              className={`text-[10px] font-bold ${
                                isValidNIT(leadNit) ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {isValidNIT(leadNit) ? '✓ Válido' : 'Formato incompleto'}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={17}
                          value={leadNit}
                          onChange={(e) => setLeadNit(formatNIT(e.target.value))}
                          placeholder="00000000-0 o 0000-000000-000-0"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono outline-none focus:border-white transition-all"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Homologado (9 dígitos) o tradicional (14 dígitos)</p>
                      </div>
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Ingresos Mensuales Declarados ($) *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={leadMonthlyIncome || ''}
                          onChange={(e) => setLeadMonthlyIncome(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono outline-none focus:border-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Actividad Económica / Empleo</label>
                        <input
                          type="text"
                          value={leadEconomicActivity}
                          onChange={(e) => setLeadEconomicActivity(e.target.value)}
                          placeholder="Ingeniero / Comerciante"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-slate-300 font-semibold mb-1">Dirección de Domicilio *</label>
                        <input
                          type="text"
                          required
                          value={leadAddress}
                          onChange={(e) => setLeadAddress(e.target.value)}
                          placeholder="Colonia, Calle, Municipio y Departamento"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-white"
                        />
                      </div>
                    </div>

                    {/* PARTE DE CARGA DE LOS 5 DOCUMENTOS OBLIGATORIOS (PC Y MÓVIL) */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-300" />
                          <span>Expediente Documental Obligatorio</span>
                        </h4>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            uploadedDocsCount === 5
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {uploadedDocsCount} de 5 Documentos Cargados
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 1. DUI */}
                        <div
                          className={`p-4 rounded-2xl border transition-all ${
                            duiDoc
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                                <span>1. DUI (Documento de Identidad)</span>
                                <span className="text-rose-400">*</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Copia o foto legible del DUI vigente
                              </p>
                            </div>
                            {duiDoc ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Cargado</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400">
                                Requerido
                              </span>
                            )}
                          </div>

                          <div className="mt-3">
                            <input
                              type="file"
                              id="doc-dui-file"
                              accept="image/*,application/pdf"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleDocSelect('DUI_FRONT', e.target.files[0]);
                              }}
                            />
                            {duiDoc ? (
                              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs">
                                <span className="font-mono text-emerald-300 truncate max-w-[200px]">
                                  {duiDoc.fileName}
                                </span>
                                <label
                                  htmlFor="doc-dui-file"
                                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer ml-2"
                                >
                                  Cambiar
                                </label>
                              </div>
                            ) : (
                              <label
                                htmlFor="doc-dui-file"
                                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 hover:border-slate-400 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                              >
                                <Camera className="w-3.5 h-3.5 text-slate-400" />
                                <span>Subir archivo o tomar foto</span>
                              </label>
                            )}
                          </div>
                        </div>

                        {/* 2. NIT */}
                        <div
                          className={`p-4 rounded-2xl border transition-all ${
                            nitDoc
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                                <span>2. NIT (Representación Tributaria)</span>
                                <span className="text-rose-400">*</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Tarjeta o comprobante digital de NIT
                              </p>
                            </div>
                            {nitDoc ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Cargado</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400">
                                Requerido
                              </span>
                            )}
                          </div>

                          <div className="mt-3">
                            <input
                              type="file"
                              id="doc-nit-file"
                              accept="image/*,application/pdf"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleDocSelect('NIT', e.target.files[0]);
                              }}
                            />
                            {nitDoc ? (
                              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs">
                                <span className="font-mono text-emerald-300 truncate max-w-[200px]">
                                  {nitDoc.fileName}
                                </span>
                                <label
                                  htmlFor="doc-nit-file"
                                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer ml-2"
                                >
                                  Cambiar
                                </label>
                              </div>
                            ) : (
                              <label
                                htmlFor="doc-nit-file"
                                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 hover:border-slate-400 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                              >
                                <Camera className="w-3.5 h-3.5 text-slate-400" />
                                <span>Subir archivo o tomar foto</span>
                              </label>
                            )}
                          </div>
                        </div>

                        {/* 3. LICENCIA DE CONDUCIR */}
                        <div
                          className={`p-4 rounded-2xl border transition-all ${
                            licenseDoc
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                                <span>3. Licencia de Conducir</span>
                                <span className="text-rose-400">*</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Licencia salvadoreña vigente
                              </p>
                            </div>
                            {licenseDoc ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Cargado</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400">
                                Requerido
                              </span>
                            )}
                          </div>

                          <div className="mt-3">
                            <input
                              type="file"
                              id="doc-lic-file"
                              accept="image/*,application/pdf"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleDocSelect('DRIVER_LICENSE', e.target.files[0]);
                              }}
                            />
                            {licenseDoc ? (
                              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs">
                                <span className="font-mono text-emerald-300 truncate max-w-[200px]">
                                  {licenseDoc.fileName}
                                </span>
                                <label
                                  htmlFor="doc-lic-file"
                                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer ml-2"
                                >
                                  Cambiar
                                </label>
                              </div>
                            ) : (
                              <label
                                htmlFor="doc-lic-file"
                                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 hover:border-slate-400 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                              >
                                <Camera className="w-3.5 h-3.5 text-slate-400" />
                                <span>Subir archivo o tomar foto</span>
                              </label>
                            )}
                          </div>
                        </div>

                        {/* 4. COMPROBANTE DE INGRESOS */}
                        <div
                          className={`p-4 rounded-2xl border transition-all ${
                            incomeDoc
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                                <span>4. Comprobante de Ingresos</span>
                                <span className="text-rose-400">*</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Constancia salarial, boleta o declaraciones IVA
                              </p>
                            </div>
                            {incomeDoc ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Cargado</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400">
                                Requerido
                              </span>
                            )}
                          </div>

                          <div className="mt-3">
                            <input
                              type="file"
                              id="doc-inc-file"
                              accept="image/*,application/pdf"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleDocSelect('PAYSLIP', e.target.files[0]);
                              }}
                            />
                            {incomeDoc ? (
                              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs">
                                <span className="font-mono text-emerald-300 truncate max-w-[200px]">
                                  {incomeDoc.fileName}
                                </span>
                                <label
                                  htmlFor="doc-inc-file"
                                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer ml-2"
                                >
                                  Cambiar
                                </label>
                              </div>
                            ) : (
                              <label
                                htmlFor="doc-inc-file"
                                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 hover:border-slate-400 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                              >
                                <Camera className="w-3.5 h-3.5 text-slate-400" />
                                <span>Subir archivo o tomar foto</span>
                              </label>
                            )}
                          </div>
                        </div>

                        {/* 5. RECIBO DE AGUA O LUZ */}
                        <div
                          className={`p-4 rounded-2xl border transition-all sm:col-span-2 ${
                            utilityDoc
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                                <span>5. Recibo de Agua o Luz (Comprobante de Domicilio)</span>
                                <span className="text-rose-400">*</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Factura reciente de energía eléctrica (CAESS, DELSUR, etc.) o agua (ANDA), vigencia no mayor a 3 meses
                              </p>
                            </div>
                            {utilityDoc ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Cargado</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400">
                                Requerido
                              </span>
                            )}
                          </div>

                          <div className="mt-3">
                            <input
                              type="file"
                              id="doc-utility-file"
                              accept="image/*,application/pdf"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleDocSelect('UTILITY_BILL', e.target.files[0]);
                              }}
                            />
                            {utilityDoc ? (
                              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs">
                                <span className="font-mono text-emerald-300 truncate max-w-[280px]">
                                  {utilityDoc.fileName}
                                </span>
                                <label
                                  htmlFor="doc-utility-file"
                                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer ml-2"
                                >
                                  Cambiar
                                </label>
                              </div>
                            ) : (
                              <label
                                htmlFor="doc-utility-file"
                                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 hover:border-slate-400 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                              >
                                <Camera className="w-3.5 h-3.5 text-slate-400" />
                                <span>Subir archivo o tomar foto del recibo</span>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botón de Formalización Oficial */}
                    <div className="pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handleFormalizeLead}
                        disabled={uploadedDocsCount < 5 || !leadDui || !leadNit || convertingLoading}
                        className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {convertingLoading ? (
                          <span>Procesando Formalización y Carga de Expediente...</span>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>
                              {uploadedDocsCount === 5
                                ? 'Formalizar y Activar Crédito Ahora'
                                : `Faltan ${5 - uploadedDocsCount} documento(s) para poder formalizar`}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Registro de Pago / Abono Extraordinario */}
      {paymentModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel rounded-3xl border border-slate-700 bg-[#0F172A] p-6 sm:p-8 shadow-2xl text-slate-100 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Registro de Pago · {selectedLoan.code}
                </span>
                <h3 className="text-lg font-bold text-white">{selectedLoan.customer.fullName}</h3>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {paymentSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-center text-sm font-semibold">
                {paymentSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleRegisterPayment} className="space-y-4">
                {paymentError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">{paymentError}</div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tipo de Movimiento Financiero
                  </label>
                  <select
                    value={paymentKind}
                    onChange={(e) => {
                      const kind = e.target.value as typeof paymentKind;
                      setPaymentKind(kind);
                      if (kind === 'PAYOFF' && payoffTotal) setPaymentAmount(payoffTotal);
                      if (kind === 'INSTALLMENT' && nextInstallmentInfo) setPaymentAmount(nextInstallmentInfo.payment);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="INSTALLMENT">Pago de Cuota Ordinaria</option>
                    <option value="PRINCIPAL_PREPAYMENT">Abono Extraordinario a Capital</option>
                    <option value="PAYOFF">Cancelación Total del Saldo</option>
                  </select>
                </div>

                {paymentKind === 'PRINCIPAL_PREPAYMENT' && (
                  <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                    <label className="block text-xs font-semibold text-slate-200">
                      Política Contractual para Abono a Capital
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setPrepayPolicy('REDUCE_TERM')}
                        className={`p-2.5 rounded-lg border text-center font-bold cursor-pointer ${
                          prepayPolicy === 'REDUCE_TERM'
                            ? 'bg-slate-200 text-slate-900 border-white'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        Reducir Plazo
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrepayPolicy('REDUCE_INSTALLMENT')}
                        className={`p-2.5 rounded-lg border text-center font-bold cursor-pointer ${
                          prepayPolicy === 'REDUCE_INSTALLMENT'
                            ? 'bg-slate-200 text-slate-900 border-white'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        Reducir Cuota
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Monto Recibido en USD *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-base font-mono text-white focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Fecha efectiva *</label>
                    <input
                      type="date"
                      required
                      max={todayLocalISO()}
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Método de pago *</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                    >
                      <option value="BANK_TRANSFER">Transferencia</option>
                      <option value="BANK_DEPOSIT">Depósito</option>
                      <option value="CASH">Efectivo</option>
                      <option value="CHECK">Cheque</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">N° de referencia / comprobante</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  />
                </div>

                <div className="p-3 bg-slate-800/40 rounded-xl text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Saldo actual de capital:</span>
                    <span className="font-mono text-white">{formatUSD(selectedLoan.currentPrincipalBalance)}</span>
                  </div>
                  {nextInstallmentInfo && (
                    <div className="flex justify-between">
                      <span>Próxima cuota (#{nextInstallmentInfo.number} · {formatDateSV(nextInstallmentInfo.dueDate)}):</span>
                      <span className="font-mono text-white">{formatUSD(nextInstallmentInfo.payment)}</span>
                    </div>
                  )}
                  {nextInstallmentInfo && nextInstallmentInfo.daysOverdue > 0 && (
                    <div className="flex justify-between text-rose-300">
                      <span>Vencida hace {nextInstallmentInfo.daysOverdue} día(s) · mora incluida:</span>
                      <span className="font-mono">{formatUSD(nextInstallmentInfo.lateFee)}</span>
                    </div>
                  )}
                  {payoffTotal && (
                    <div className="flex justify-between">
                      <span>Cancelación total hoy:</span>
                      <span className="font-mono text-white">{formatUSD(payoffTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Distribución:</span>
                    <span className="text-emerald-400">Mora → Interés → Capital</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-white text-slate-900 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {paymentSubmitting ? 'Aplicando...' : 'Confirmar y Aplicar al Crédito'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR GASTO CONTABLE (PRODUCTO O SERVICIO) */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl glass-panel rounded-3xl border border-slate-700 bg-[#0F172A] p-6 sm:p-8 shadow-2xl my-6 text-slate-100 space-y-6">
            <button
              onClick={() => setExpenseModalOpen(false)}
              className="absolute top-5 right-5 z-10 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
            >
              ✕
            </button>

            {/* Cabecera del Modal */}
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                <span>Contabilidad y Egresos · {selectedExpense ? selectedExpense.code : 'Nuevo Registro'}</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {selectedExpense ? 'Editar Registro de Gasto' : 'Registrar Nuevo Gasto Operativo'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingresa el detalle de la compra de producto o contratación de servicio para actualizar el balance contable.
              </p>
            </div>

            {/* Notificaciones de Éxito / Error */}
            {expFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{expFeedback}</span>
              </div>
            )}
            {expError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{expError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-5 text-xs">
              {/* Selector de Clasificación: PRODUCTO vs SERVICIO */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Tipo de Gasto Contable *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setExpCategoryType('PRODUCT');
                      if (!expSubcategory || expSubcategory === 'Mantenimiento y Reparación') {
                        setExpSubcategory('Repuestos e Insumos');
                      }
                    }}
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                      expCategoryType === 'PRODUCT'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${expCategoryType === 'PRODUCT' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-black text-sm block">Producto</span>
                      <span className="text-[10px] opacity-80">Bienes físicos, repuestos, llantas e insumos</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExpCategoryType('SERVICE');
                      if (!expSubcategory || expSubcategory === 'Repuestos e Insumos') {
                        setExpSubcategory('Mantenimiento y Reparación');
                      }
                    }}
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                      expCategoryType === 'SERVICE'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-lg shadow-sky-500/10'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${expCategoryType === 'SERVICE' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-black text-sm block">Servicio</span>
                      <span className="text-[10px] opacity-80">Talleres, peritajes, pólizas y honorarios</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Concepto y Subcategoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Concepto o Descripción del Gasto *
                  </label>
                  <input
                    type="text"
                    required
                    value={expConcept}
                    onChange={(e) => setExpConcept(e.target.value)}
                    placeholder="Ej. Kit de pastillas de freno cerámicas, Mantenimiento preventivo 40,000 km..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Subcategoría
                  </label>
                  <input
                    type="text"
                    value={expSubcategory}
                    onChange={(e) => setExpSubcategory(e.target.value)}
                    placeholder="Ej. Repuestos, Mantenimiento, Seguros, Peritajes..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-400 transition-colors"
                  />
                  {/* Chips rápidos para subcategorías */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(expCategoryType === 'PRODUCT'
                      ? ['Repuestos', 'Llantas', 'Baterías', 'Accesorios', 'Insumos']
                      : ['Mantenimiento', 'Peritaje', 'Seguro', 'Legal', 'Lavado']
                    ).map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setExpSubcategory(sub)}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Fecha del Gasto *
                  </label>
                  <input
                    type="date"
                    required
                    value={expExpenseDate}
                    onChange={(e) => setExpExpenseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Cantidad, Precio Unitario y Cálculo en Vivo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={expQuantity}
                    onChange={(e) => setExpQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-center outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Precio Unitario ($) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={expUnitPrice}
                    onChange={(e) => setExpUnitPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-center outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex flex-col justify-center items-center sm:items-end">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total a Contabilizar</span>
                  <span className="text-xl font-black text-amber-400 font-mono mt-0.5">
                    {formatUSD(Number(expQuantity || 1) * Number(expUnitPrice || 0))}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({expQuantity} × {formatUSD(expUnitPrice)})
                  </span>
                </div>
              </div>

              {/* Proveedor y Factura */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Proveedor o Taller
                  </label>
                  <input
                    type="text"
                    value={expProvider}
                    onChange={(e) => setExpProvider(e.target.value)}
                    placeholder="Ej. Distribuidora Automotriz S.A."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    N° de Factura o Comprobante Fiscal (CCF)
                  </label>
                  <input
                    type="text"
                    value={expInvoiceNumber}
                    onChange={(e) => setExpInvoiceNumber(e.target.value)}
                    placeholder="Ej. FAC-00984 o CCF-1249"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Forma de Pago y Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={expPaymentMethod}
                    onChange={(e) => setExpPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-400"
                  >
                    <option value="TRANSFER">Transferencia Bancaria (ACH / UNI)</option>
                    <option value="CARD">Tarjeta de Débito / Crédito Corporativa</option>
                    <option value="CASH">Efectivo / Caja Chica</option>
                    <option value="CHECK">Cheque de Gerencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Estado del Pago
                  </label>
                  <select
                    value={expStatus}
                    onChange={(e) => setExpStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-400"
                  >
                    <option value="PAID">Pagado / Liquidado</option>
                    <option value="PENDING">Pendiente de Pago (Cuenta por Pagar)</option>
                    <option value="CANCELLED">Anulado / No Aplicable</option>
                  </select>
                </div>
              </div>

              {/* Notas Adicionales */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Observaciones / Justificación Contable
                </label>
                <textarea
                  rows={2}
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="Detalles sobre el vehículo asociado, orden de compra o justificación del gasto..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Botón Guardar */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={expSaving}
                  className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {expSaving ? (
                    <span>Guardando en Contabilidad...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{selectedExpense ? 'Guardar Cambios' : 'Registrar en Contabilidad'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN DE GASTO */}
      {deleteExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel rounded-3xl border border-slate-700 bg-[#0F172A] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Eliminar Registro de Gasto?</h3>
                <span className="text-xs text-slate-400">Esta acción no se puede deshacer.</span>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              El registro será eliminado del historial contable y los totales acumulados del balance se recalcularán automáticamente.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteExpenseId(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteExpense(deleteExpenseId)}
                disabled={deletingExpense}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {deletingExpense ? 'Eliminando...' : 'Sí, Eliminar Gasto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
