# 🚀 GitHub Deployment Instructions

## Quick Setup via GitHub

### 1. Push Changes to Repository

```bash
# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat: добавлена система управления типами техники

- Добавлены API эндпоинты для CRUD операций с типами техники
- Реализован UI для управления типами в форме создания техники
- Добавлены кнопки быстрого добавления типов и подтипов
- Валидация и защита от удаления используемых типов
- Полная интеграция с существующей системой"

# Push to main branch
git push origin main
```

### 2. Server Deployment via Git

```bash
# On your server, navigate to project directory
cd /path/to/your/project

# Pull latest changes
git pull origin main

# Restart application
pm2 restart all
# or
sudo systemctl restart your-service-name
```

### 3. Verify Deployment

```bash
# Check server status
pm2 status

# Test API endpoints
curl http://your-domain/api/equipment/equipment-types

# Check logs for any errors
pm2 logs --lines 50
```

## Files Changed

- ✅ `backend/routes/equipment.js` - New API endpoints
- ✅ `index.html` - New modal windows and UI elements  
- ✅ `style.css` - Styles for equipment types management
- ✅ `app.js` - JavaScript logic for types management
- ✅ `EQUIPMENT_TYPES_MANAGEMENT_GUIDE.md` - Full deployment guide
- ✅ No database migrations needed (equipment_types table exists)

## Key Features Added

1. **Equipment Types Management Panel** - Full CRUD interface
2. **Quick Add Buttons** - Add types/subtypes directly from equipment form
3. **Smart Validation** - Prevent duplicate type+subtype combinations
4. **Usage Protection** - Cannot delete types that are in use
5. **Real-time Updates** - Lists refresh automatically after changes

## Testing Checklist

- [ ] Login as equipment owner
- [ ] Open "Add Equipment" form
- [ ] Click "⚙️ Equipment Types Management"
- [ ] Add new equipment type
- [ ] Use quick add buttons (+) for type/subtype
- [ ] Try to delete a type that's in use (should be blocked)
- [ ] Verify types appear in equipment creation form

## Rollback Plan

If issues occur:
```bash
# Revert to previous commit
git revert HEAD

# Or checkout previous working commit
git checkout PREVIOUS_COMMIT_HASH

# Restart server
pm2 restart all
```

## Support

Check logs if issues arise:
- Backend logs: `pm2 logs`
- Browser console: F12 → Console
- Network requests: F12 → Network tab
