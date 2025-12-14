- make below code in 1 line 
$q.notify({
      type: 'positive',
      message: t('attendance.notification.success', 'Attendance recorded successfully')
    });
like 
$q.notify({type: 'positive',message: t('attendance.notification.success', 'Attendance recorded ')});

- extract DTO like object to @/interface
- replace sample json data to API call response data 
- use related api-x.ts API call class file on @/api/modules 

---  

- integrate all dialog layout design to one style 
- extract used scss to 1 file @/styles

--- 
columnDef each column properties in 1 line 