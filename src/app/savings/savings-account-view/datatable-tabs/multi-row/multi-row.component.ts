/** Angular Imports */
import { Component, OnChanges, OnInit, Input, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatTable } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';

/** Custom Dialogs */
import { FormDialogComponent } from 'app/shared/form-dialog/form-dialog.component';
import { DeleteDialogComponent } from '../../../../shared/delete-dialog/delete-dialog.component';
import { SettingsService } from 'app/settings/settings.service';

/** Custom Models */
import { FormfieldBase } from 'app/shared/form-dialog/formfield/model/formfield-base';
import { InputBase } from 'app/shared/form-dialog/formfield/model/input-base';
import { SelectBase } from 'app/shared/form-dialog/formfield/model/select-base';
import { CheckboxBase } from 'app/shared/form-dialog/formfield/model/checkbox-base';
import { DatepickerBase } from 'app/shared/form-dialog/formfield/model/datepicker-base';

/** Custom Services */
import { SavingsService } from '../../../savings.service';
import { Dates } from 'app/core/utils/dates';
import { Datatables } from 'app/core/utils/datatables';
import { DateFormatPipe } from 'app/pipes/date-format.pipe';
import { DatetimeFormatPipe } from 'app/pipes/datetime-format.pipe';
import { DecimalPipe } from '@angular/common';

/**
 * Savings Account Multi Row Data Tables
 */
@Component({
  selector: 'mifosx-multi-row',
  templateUrl: './multi-row.component.html',
  styleUrls: ['./multi-row.component.scss']
})
export class MultiRowComponent implements OnInit, OnChanges {

  /** Data Object */
  @Input() dataObject: any;

  /** Data Table Name */
  datatableName: string;
  /** Data Table Columns */
  datatableColumns: string[] = [];
  /** Data Table Data */
  datatableData: any;
  /** Savings Id */
  savingAccountId: string;
  /** Toggle button visibility */
  showDeleteBotton: boolean;

  /** Data Table Reference */
  @ViewChild('dataTable', { static: true }) dataTableRef: MatTable<Element>;

  /**
   * Fetches savings account Id from parent route params.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Dates} dateUtils Date Utils.
   * @param {SavingsService} savingsService Savingss Service.
   * @param {MatDialog} dialog Mat Dialog.
   * @param {SettingsService} settingsService Setting service
   * @param {Datatables} datatables Datatable utils
   */
  constructor(private route: ActivatedRoute,
              private dateUtils: Dates,
              private savingsService: SavingsService,
              private dialog: MatDialog,
              private settingsService: SettingsService,
              private datatables: Datatables,
              private dateFormat: DateFormatPipe,
              private dateTimeFormat: DatetimeFormatPipe,
              private numberFormat: DecimalPipe) {
    this.savingAccountId = this.route.parent.parent.snapshot.paramMap.get('savingAccountId');
  }

  /**
   * Updates related variables on changes to dataObject.
   */
  ngOnChanges() {
    this.datatableColumns = this.dataObject.columnHeaders.map((columnHeader: any) => {
      return columnHeader.columnName;
    });
    this.datatableData = this.dataObject.data;
    this.showDeleteBotton = this.datatableData[0] ? true : false;
  }

  /**
   * Fetches data table name from route params.
   * subscription is required due to asynchronicity.
   */
  ngOnInit() {
    this.route.params.subscribe((routeParams: any) => {
      this.datatableName = routeParams.datatableName;
    });
  }

  /**
   * Adds a new row to the given multi row data table.
   */
  add() {
    let dataTableEntryObject: any = { locale: this.settingsService.language.code };
    const dateTransformColumns: string[] = [];
    const columns = this.dataObject.columnHeaders.filter((column: any) => {
      return ((column.columnName !== 'id') && (column.columnName !== 'savings_account_id'));
    });
    const formfields: FormfieldBase[] = this.datatables.getFormfields(columns, dateTransformColumns, dataTableEntryObject);
    const data = {
      title: 'Add ' + this.datatableName,
      formfields: formfields
    };
    const addDialogRef = this.dialog.open(FormDialogComponent, { data });
    addDialogRef.afterClosed().subscribe((response: any) => {
      if (response.data) {
        dateTransformColumns.forEach((column) => {
          response.data.value[column] = this.dateUtils.formatDate(response.data.value[column], dataTableEntryObject.dateFormat);
        });
        dataTableEntryObject = { ...response.data.value, ...dataTableEntryObject };
        this.savingsService.addSavingsDatatableEntry(this.savingAccountId, this.datatableName, dataTableEntryObject).subscribe(() => {
          this.savingsService.getSavingsDatatable(this.savingAccountId, this.datatableName).subscribe((dataObject: any) => {
            this.datatableData = dataObject.data;
            this.dataTableRef.renderRows();
          });
        });
      }
    });
  }

  /**
   * Deletes all rows of the given multi row data table.
   */
  delete() {
    const deleteDataTableDialogRef = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: `the contents of ${this.datatableName}` }
    });
    deleteDataTableDialogRef.afterClosed().subscribe((response: any) => {
      if (response.delete) {
        this.savingsService.deleteDatatableContent(this.savingAccountId, this.datatableName).subscribe(() => {
          this.savingsService.getSavingsDatatable(this.savingAccountId, this.datatableName).subscribe((dataObject: any) => {
            this.datatableData = dataObject.data;
            this.showDeleteBotton = false;
            this.dataTableRef.renderRows();
           });
        });
      }
    });
  }

  formatValue(index: number, value: any): any {
    const columnDisplayType = this.dataObject.columnHeaders[index].columnDisplayType;
    if (columnDisplayType === 'DATE') {
      return this.dateFormat.transform(value);
    } else if (columnDisplayType === 'DATETIME') {
      return this.dateTimeFormat.transform(value);
    } else if (columnDisplayType === 'INTEGER' || columnDisplayType === 'DECIMAL') {
      return this.numberFormat.transform(value);
    }
    return value;
  }

}
