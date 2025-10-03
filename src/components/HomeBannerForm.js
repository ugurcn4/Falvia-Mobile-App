import React, { useEffect, useState } from 'react';
import { Card, Form, Row, Col, Button, Alert } from 'react-bootstrap';
import colors from '../styles/colors';

const flattenPaletteKeys = (obj, prefix = '') => {
  const keys = [];
  Object.keys(obj).forEach(k => {
    const value = obj[k];
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenPaletteKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  });
  return keys;
};

const paletteKeyOptions = flattenPaletteKeys(colors);

const toDateTimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => `${n}`.padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

const fromDateTimeLocalToISO = (local) => {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const defaultForm = {
  is_enabled: false,
  priority: 0,
  title: '',
  subtitle: '',
  use_gradient: true,
  gradient_start_palette_key: '',
  gradient_end_palette_key: '',
  gradient_start_hex: '',
  gradient_end_hex: '',
  background_color_palette_key: '',
  background_color_hex: '',
  text_color_palette_key: '',
  text_color_hex: '',
  icon_type: 'none',
  icon_name: '',
  image_url: '',
  show_close_button: true,
  dismiss_storage_key: '',
  max_impressions_per_day: '',
  action_type: 'navigate',
  action_payload: '{\n  "route": "",\n  "params": {}\n}',
  platforms: [],
  start_at: '',
  end_at: '',
  min_app_version: '',
  min_token_balance: '',
};

const actionExamples = {
  navigate: `{
  "route": "ScreenName",
  "params": { "foo": "bar" }
}`,
  open_url: `{
  "url": "https://example.com"
}`,
  new_fortune: `{
  "fortuneType": { "id": 1, "name": "Kahve Falı" }
}`,
  buy_tokens: `{}
`,
};

const HomeBannerForm = ({ initialData = null, onSave, onSuccess }) => {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    if (initialData) {
      setForm({
        is_enabled: !!initialData.is_enabled,
        priority: initialData.priority ?? 0,
        title: initialData.title || '',
        subtitle: initialData.subtitle || '',
        use_gradient: !!initialData.use_gradient,
        gradient_start_palette_key: initialData.gradient_start_palette_key || '',
        gradient_end_palette_key: initialData.gradient_end_palette_key || '',
        gradient_start_hex: initialData.gradient_start_hex || '',
        gradient_end_hex: initialData.gradient_end_hex || '',
        background_color_palette_key: initialData.background_color_palette_key || '',
        background_color_hex: initialData.background_color_hex || '',
        text_color_palette_key: initialData.text_color_palette_key || '',
        text_color_hex: initialData.text_color_hex || '',
        icon_type: initialData.icon_type || 'none',
        icon_name: initialData.icon_name || '',
        image_url: initialData.image_url || '',
        show_close_button: !!initialData.show_close_button,
        dismiss_storage_key: initialData.dismiss_storage_key || '',
        max_impressions_per_day: initialData.max_impressions_per_day ?? '',
        action_type: initialData.action_type || 'navigate',
        action_payload: initialData.action_payload ? JSON.stringify(initialData.action_payload, null, 2) : '{\n  "route": "",\n  "params": {}\n}',
        platforms: Array.isArray(initialData.platforms) ? initialData.platforms : [],
        start_at: toDateTimeLocal(initialData.start_at),
        end_at: toDateTimeLocal(initialData.end_at),
        min_app_version: initialData.min_app_version || '',
        min_token_balance: initialData.min_token_balance ?? '',
      });
    }
  }, [initialData]);

  const showAlert = (message, variant = 'success') => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 3000);
  };

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMultiSelectChange = (e) => {
    const options = Array.from(e.target.selectedOptions).map(o => o.value);
    setForm(prev => ({ ...prev, platforms: options }));
  };

  const validate = () => {
    if (!form.title.trim()) return 'Başlık zorunludur.';
    const priority = Number(form.priority);
    if (isNaN(priority) || priority < 0) return 'Öncelik 0 veya daha büyük olmalıdır.';

    if (form.use_gradient) {
      const hasStart = !!(form.gradient_start_palette_key || form.gradient_start_hex);
      const hasEnd = !!(form.gradient_end_palette_key || form.gradient_end_hex);
      if (!(hasStart || hasEnd)) return 'Gradient için en az bir uç renk (başlangıç veya bitiş) girilmelidir.';
    } else {
      const hasBg = !!(form.background_color_palette_key || form.background_color_hex);
      if (!hasBg) return 'Düz arka plan için en az bir arka plan rengi girilmelidir.';
    }

    if (!form.text_color_palette_key && !form.text_color_hex) {
      // Otomatik beyaz
    }

    if (form.icon_type === 'none' && form.icon_name.trim()) {
      return 'İkon tipi "none" iken ikon adı boş olmalıdır.';
    }

    if (form.max_impressions_per_day !== '' && Number(form.max_impressions_per_day) < 0) {
      return 'Günlük gösterim limiti 0 veya daha büyük olmalıdır.';
    }

    if (form.min_token_balance !== '' && Number(form.min_token_balance) < 0) {
      return 'Minimum jeton bakiyesi 0 veya daha büyük olmalıdır.';
    }

    if (form.start_at && form.end_at) {
      const start = new Date(form.start_at).getTime();
      const end = new Date(form.end_at).getTime();
      if (start >= end) return 'Başlangıç tarihi bitiş tarihinden küçük olmalıdır.';
    }

    if (form.action_payload) {
      try {
        JSON.parse(form.action_payload);
      } catch (err) {
        return 'Aksiyon verisi (JSON) geçerli bir JSON olmalıdır.';
      }
    }

    return null;
  };

  const buildPayload = () => {
    const payload = {
      is_enabled: !!form.is_enabled,
      priority: Number(form.priority) || 0,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      use_gradient: !!form.use_gradient,
      gradient_start_palette_key: form.gradient_start_palette_key || null,
      gradient_end_palette_key: form.gradient_end_palette_key || null,
      gradient_start_hex: form.gradient_start_hex || null,
      gradient_end_hex: form.gradient_end_hex || null,
      background_color_palette_key: form.background_color_palette_key || null,
      background_color_hex: form.background_color_hex || null,
      text_color_palette_key: form.text_color_palette_key || null,
      text_color_hex: form.text_color_hex || null,
      icon_type: form.icon_type,
      icon_name: form.icon_type === 'none' ? null : (form.icon_name.trim() || null),
      image_url: form.image_url.trim() || null,
      show_close_button: !!form.show_close_button,
      dismiss_storage_key: form.dismiss_storage_key.trim() || null,
      max_impressions_per_day: form.max_impressions_per_day === '' ? null : Number(form.max_impressions_per_day),
      action_type: form.action_type,
      action_payload: form.action_payload ? JSON.parse(form.action_payload) : {},
      platforms: Array.isArray(form.platforms) ? form.platforms : [],
      start_at: fromDateTimeLocalToISO(form.start_at),
      end_at: fromDateTimeLocalToISO(form.end_at),
      min_app_version: form.min_app_version.trim() || null,
      min_token_balance: form.min_token_balance === '' ? null : Number(form.min_token_balance),
      updated_at: new Date().toISOString(),
    };

    if (!payload.text_color_palette_key && !payload.text_color_hex) {
      payload.text_color_hex = '#FFFFFF';
    }

    if (!payload.use_gradient) {
      payload.gradient_start_palette_key = null;
      payload.gradient_end_palette_key = null;
      payload.gradient_start_hex = null;
      payload.gradient_end_hex = null;
    } else {
      payload.background_color_palette_key = null;
      payload.background_color_hex = null;
    }

    return payload;
  };

  const currentActionExample = actionExamples[form.action_type] || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      console.warn('[HomeBannerForm] Validation error:', error);
      showAlert(error, 'danger');
      return;
    }
    try {
      setSaving(true);
      const payload = buildPayload();
      const ok = await onSave(payload);
      if (ok) {
        showAlert('Kaydedildi', 'success');
        if (onSuccess) onSuccess();
      } else {
        console.warn('[HomeBannerForm] Save returned false');
        showAlert('Kayıt başarısız', 'danger');
      }
    } catch (err) {
      console.error('[HomeBannerForm] Save error:', err);
      showAlert(err.message || 'Beklenmeyen bir hata oluştu', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const previewStyle = {
    background: form.use_gradient ?
      `linear-gradient(to right, ${form.gradient_start_hex || colors[form.gradient_start_palette_key] || '#007bff'}, ${form.gradient_end_hex || colors[form.gradient_end_palette_key] || '#6c757d'})` :
      form.background_color_hex || colors[form.background_color_palette_key] || '#e9ecef',
    color: form.text_color_hex || colors[form.text_color_palette_key] || '#343a40',
    borderRadius: 12,
    padding: 16,
    minHeight: 140,
    position: 'relative',
  };
  previewStyle.height = 160; // fixed height
  previewStyle.width = '100%';

  const textColor = form.text_color_hex || colors[form.text_color_palette_key] || '#343a40';

  const getPaletteColorHex = (paletteKey) => {
    if (!paletteKey) return null;
    const keys = paletteKey.split('.');
    let color = colors;
    for (const key of keys) {
      color = color[key];
      if (!color) return null;
    }
    return color;
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        {alert.show && (
          <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false, message: '', variant: 'success' })}>
            {alert.message}
          </Alert>
        )}
        <Form id="homeBannerForm" onSubmit={handleSubmit}>
          {/* Mobil Önizleme */}
          <div className="d-md-none mb-3">
            <Card>
              <Card.Header>Önizleme</Card.Header>
              <Card.Body>
                <div style={{ ...previewStyle, borderRadius: 12, padding: 16, minHeight: 140, position: 'relative' }}>
                  {form.show_close_button && (
                    <div style={{ position: 'absolute', top: 8, right: 10, opacity: 0.85 }}>✕</div>
                  )}
                  <div className="d-flex align-items-center gap-3">
                    {form.image_url ? (
                      <img src={form.image_url} alt="preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink:0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink:0 }}>
                        <span style={{ fontSize: 20, color: textColor }}>{form.icon_name ? form.icon_name.substring(0, 2).toUpperCase() : '★'}</span>
                      </div>
                    )}
                    <div className="flex-grow-1">
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{form.title || 'Banner Başlığı'}</div>
                      <div style={{ opacity: 0.9 }}>{form.subtitle || 'Açıklama metni burada gözükecek'}</div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
          <Row>
            <Col md={8}>
              <Card className="mb-3">
                <Card.Header>Genel</Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Check
                        type="switch"
                        id="is_enabled"
                        name="is_enabled"
                        label="Aktif"
                        checked={form.is_enabled}
                        onChange={handleChange}
                      />
                      <div className="text-muted small mt-1">Banner yayında olsun mu? Filtre ve zamanlama koşulları sağlandığında gösterilir.</div>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Öncelik</Form.Label>
                        <Form.Control type="number" min={0} name="priority" value={form.priority} onChange={handleChange} />
                        <Form.Text className="text-muted">Büyük olan önce görünür. 0 ve üzeri değer girin.</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Başlık</Form.Label>
                        <Form.Control type="text" name="title" value={form.title} onChange={handleChange} required />
                        <Form.Text className="text-muted">Kısa ve net bir başlık önerilir.</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>Alt Başlık</Form.Label>
                        <Form.Control as="textarea" rows={3} name="subtitle" value={form.subtitle} onChange={handleChange} />
                        <Form.Text className="text-muted">İsteğe bağlı açıklama metni.</Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header>Görünüm</Card.Header>
                <Card.Body>
                  <Form.Check
                    type="switch"
                    id="use_gradient"
                    name="use_gradient"
                    label="Gradient Kullan"
                    checked={form.use_gradient}
                    onChange={handleChange}
                    className="mb-1"
                  />
                  <div className="text-muted small mb-3">Açıkken gradient renkleri, kapalıyken düz arka plan kullanılır. Renk önceliği: palet anahtarı → hex.</div>

                  {form.use_gradient ? (
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Gradient Start (Palette)</Form.Label>
                          <div className="d-flex align-items-center gap-2">
                            <div style={{ width: 24, height: 24, backgroundColor: getPaletteColorHex(form.gradient_start_palette_key) || '#ffffff', border: '1px solid #ccc', borderRadius:4 }} />
                            <Form.Select name="gradient_start_palette_key" value={form.gradient_start_palette_key} onChange={handleChange} className="flex-grow-1">
                              <option value="">(Boş)</option>
                              {paletteKeyOptions.map(k => (
                                <option key={k} value={k}>{k}</option>
                              ))}
                            </Form.Select>
                          </div>
                          <Form.Text className="text-muted">`src/styles/colors.js` içindeki anahtarlar. Palet doluysa hex yok sayılır.</Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Gradient End (Palette)</Form.Label>
                          <div className="d-flex align-items-center gap-2">
                            <div style={{ width: 24, height: 24, backgroundColor: getPaletteColorHex(form.gradient_end_palette_key) || '#ffffff', border: '1px solid #ccc', borderRadius:4 }} />
                            <Form.Select name="gradient_end_palette_key" value={form.gradient_end_palette_key} onChange={handleChange} className="flex-grow-1">
                              <option value="">(Boş)</option>
                              {paletteKeyOptions.map(k => (
                                <option key={k} value={k}>{k}</option>
                              ))}
                            </Form.Select>
                          </div>
                          <Form.Text className="text-muted">Örn: primaryDark, secondary, text.accent.</Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Gradient Start (Hex)</Form.Label>
                          <Form.Control type="text" name="gradient_start_hex" value={form.gradient_start_hex} onChange={handleChange} placeholder="#RRGGBB" />
                          <Form.Text className="text-muted">Palet girilmemişse kullanılır. Örn: #4A0080</Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Gradient End (Hex)</Form.Label>
                          <Form.Control type="text" name="gradient_end_hex" value={form.gradient_end_hex} onChange={handleChange} placeholder="#RRGGBB" />
                          <Form.Text className="text-muted">Palet yoksa fallback olarak kullanılır.</Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  ) : (
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Arka Plan (Palette)</Form.Label>
                          <div className="d-flex align-items-center gap-2">
                            <div style={{ width: 24, height: 24, backgroundColor: getPaletteColorHex(form.background_color_palette_key) || '#ffffff', border: '1px solid #ccc', borderRadius:4 }} />
                            <Form.Select name="background_color_palette_key" value={form.background_color_palette_key} onChange={handleChange} className="flex-grow-1">
                              <option value="">(Boş)</option>
                              {paletteKeyOptions.map(k => (
                                <option key={k} value={k}>{k}</option>
                              ))}
                            </Form.Select>
                          </div>
                          <Form.Text className="text-muted">Palet doluysa hex alanı yok sayılır.</Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Arka Plan (Hex)</Form.Label>
                          <Form.Control type="text" name="background_color_hex" value={form.background_color_hex} onChange={handleChange} placeholder="#RRGGBB" />
                          <Form.Text className="text-muted">Palet anahtarı girilmediğinde kullanılır.</Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  )}

                  <Row className="g-3 mt-1">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Yazı Rengi (Palette)</Form.Label>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width: 24, height: 24, backgroundColor: getPaletteColorHex(form.text_color_palette_key) || '#ffffff', border: '1px solid #ccc', borderRadius:4 }} />
                          <Form.Select name="text_color_palette_key" value={form.text_color_palette_key} onChange={handleChange} className="flex-grow-1">
                            <option value="">(Boş)</option>
                            {paletteKeyOptions.map(k => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </Form.Select>
                        </div>
                        <Form.Text className="text-muted">Boşsa otomatik olarak #FFFFFF atanır.</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Yazı Rengi (Hex)</Form.Label>
                        <Form.Control type="text" name="text_color_hex" value={form.text_color_hex} onChange={handleChange} placeholder="#FFFFFF" />
                        <Form.Text className="text-muted">Palet anahtarı yoksa bu değer kullanılır.</Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  <datalist id="paletteKeys">
                    {paletteKeyOptions.map(k => (
                      <option key={k} value={k} />
                    ))}
                  </datalist>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header>Görsel / İkon</Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>İkon Tipi</Form.Label>
                        <Form.Select name="icon_type" value={form.icon_type} onChange={handleChange}>
                          <option value="none">none</option>
                          <option value="ion">ion</option>
                          <option value="material">material</option>
                        </Form.Select>
                        <Form.Text className="text-muted">Ionicons veya MaterialCommunityIcons setinden seçim yapın.</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>İkon Adı</Form.Label>
                        <Form.Control type="text" name="icon_name" value={form.icon_name} onChange={handleChange} placeholder="örn: star, gift, diamond" />
                        <Form.Text className="text-muted d-block mb-2">`icon_type=none` iken boş olmalıdır.</Form.Text>
                        <div className="d-flex gap-2 mb-2">
                          <a href="https://ionic.io/ionicons" target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
                            🔍 Ionicons Ara
                          </a>
                          <a href="https://pictogrammers.com/library/mdi/" target="_blank" rel="noopener noreferrer" className="btn btn-outline-success btn-sm">
                            🔍 Material Icons Ara
                          </a>
                        </div>
                        <div className="small text-muted">
                          <div className="mb-1"><strong>Ionicons:</strong> Sitede ikonu bulun → "Copy name" butonuna tıklayın → "star" gibi kısa adı kopyalayın.</div>
                          <div><strong>Material Icons:</strong> Sitede ikonu bulun → "Copy name" butonuna tıklayın → "star" gibi kısa adı kopyalayın.</div>
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Görsel URL</Form.Label>
                        <Form.Control type="text" name="image_url" value={form.image_url} onChange={handleChange} placeholder="https://..." />
                        <Form.Text className="text-muted">Doluysa ikon yok sayılır.</Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header>Kısıtlar</Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Check
                        type="switch"
                        id="show_close_button"
                        name="show_close_button"
                        label="Kapatma Butonu"
                        checked={form.show_close_button}
                        onChange={handleChange}
                      />
                      <div className="text-muted small mt-1">Kullanıcı kapatırsa bir daha gösterilmez (dismiss anahtarıyla takip edilir).</div>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Günlük Gösterim Limiti</Form.Label>
                        <Form.Control type="number" min={0} name="max_impressions_per_day" value={form.max_impressions_per_day} onChange={handleChange} />
                        <Form.Text className="text-muted">Kullanıcı başına, gün bazlı limit. Boş bırakırsanız sınırsız.</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Dismiss Storage Key</Form.Label>
                        <Form.Control type="text" name="dismiss_storage_key" value={form.dismiss_storage_key} onChange={handleChange} />
                        <Form.Text className="text-muted">AsyncStorage anahtarı. Boşsa `id` kullanılır. Yayına alıp kaldırdığınızda sabit kalmasını istiyorsanız özel bir anahtar verin.</Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header>Hedefleme</Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Platformlar</Form.Label>
                        <Form.Select multiple value={form.platforms} onChange={handleMultiSelectChange}>
                          <option value="ios">ios</option>
                          <option value="android">android</option>
                        </Form.Select>
                        <Form.Text className="text-muted">Çoklu seçim yapılabilir.</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Minimum Uygulama Versiyonu</Form.Label>
                        <Form.Control type="text" name="min_app_version" value={form.min_app_version} onChange={handleChange} placeholder="örn: 1.2.0" />
                        <Form.Text className="text-muted">Semver formatı. Client tarafında versiyon kontrolü yapılır.</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Başlangıç</Form.Label>
                        <Form.Control type="datetime-local" name="start_at" value={form.start_at} onChange={handleChange} />
                        <Form.Text className="text-muted">Yayın başlangıcı. Veritabanına UTC olarak kaydedilir.</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Bitiş</Form.Label>
                        <Form.Control type="datetime-local" name="end_at" value={form.end_at} onChange={handleChange} />
                        <Form.Text className="text-muted">Yayın bitişi. Boş bırakılırsa süresiz.</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Minimum Jeton Bakiyesi</Form.Label>
                        <Form.Control type="number" min={0} name="min_token_balance" value={form.min_token_balance} onChange={handleChange} />
                        <Form.Text className="text-muted">Bu eşik altındaki kullanıcılara gösterilmez.</Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="mb-3">
                <Card.Header>Aksiyon</Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Aksiyon Tipi</Form.Label>
                        <Form.Select name="action_type" value={form.action_type} onChange={handleChange}>
                          <option value="navigate">navigate</option>
                          <option value="open_url">open_url</option>
                          <option value="new_fortune">new_fortune</option>
                          <option value="buy_tokens">buy_tokens</option>
                        </Form.Select>
                        <Form.Text className="text-muted">Seçime göre aksiyon JSON şemasını doldurun.</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={8}>
                      <Form.Group>
                        <Form.Label>Aksiyon Verisi (JSON)</Form.Label>
                        <Form.Control as="textarea" rows={8} name="action_payload" value={form.action_payload} onChange={handleChange} spellCheck={false} />
                        <Form.Text className="text-muted d-block mb-1">Geçerli JSON olmalıdır.</Form.Text>
                        <div className="small">
                          <div className="text-muted">Örnek ({form.action_type}):</div>
                          <pre className="bg-dark text-light p-2 rounded" style={{ whiteSpace: 'pre-wrap' }}>{currentActionExample}</pre>
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

            </Col>
            {/* Desktop Önizleme */}
            <Col md={4} className="d-none d-md-flex">
              <div className="d-flex flex-column gap-3 sticky-top" style={{ top: 12 }}>
                <Card>
                  <Card.Header>Önizleme</Card.Header>
                  <Card.Body>
                    <div style={{ ...previewStyle, borderRadius: 12, padding: 16, minHeight: 140, position: 'relative' }}>
                      {form.show_close_button && (
                        <div style={{ position: 'absolute', top: 8, right: 10, opacity: 0.85 }}>✕</div>
                      )}
                      <div className="d-flex align-items-center gap-3">
                        {form.image_url ? (
                          <img src={form.image_url} alt="preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink:0 }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink:0 }}>
                            <span style={{ fontSize: 20, color: textColor }}>{form.icon_name ? form.icon_name.substring(0, 2).toUpperCase() : '★'}</span>
                          </div>
                        )}
                        <div className="flex-grow-1">
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{form.title || 'Banner Başlığı'}</div>
                          <div style={{ opacity: 0.9 }}>{form.subtitle || 'Açıklama metni burada gözükecek'}</div>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </Col>
          </Row>
          {/* Fixed bottom bar for mobile save button */}
          <div className="d-md-none" style={{ height: 72 }}></div> {/* Spacer to avoid overlap */}
        </Form>
        {/* Fixed bar outside form to keep button always visible on small screens */}
        <div className="d-md-none position-fixed bottom-0 start-0 end-0 p-2 bg-light border-top" style={{ zIndex: 1050 }}>
          <Button type="submit" form="homeBannerForm" variant="primary" disabled={saving} className="w-100">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
        {/* Floating save button for desktop */}
        <div className="d-none d-md-block position-fixed" style={{ bottom: 20, right: 24, zIndex: 1050 }}>
          <Button type="submit" form="homeBannerForm" variant="primary" disabled={saving} style={{ borderRadius: 50, width: 180, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default HomeBannerForm; 