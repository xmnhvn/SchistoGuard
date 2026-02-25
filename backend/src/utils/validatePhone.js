/**
 * Validates Philippine mobile phone numbers
 * Accepts formats:
 * - 09171234567 (11 digits, starts with 09)
 * - +639171234567 (with country code)
 * - 0917 123 4567 (with spaces)
 */
function validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return false;
    
    // Remove spaces and hyphens
    let cleaned = phone.replace(/[\s\-]/g, '');
    
    // Handle +63 prefix (convert to 0 for validation)
    let normalized = cleaned;
    if (cleaned.startsWith('+63')) {
        normalized = '0' + cleaned.slice(3);
    }
    
    // Valid patterns:
    // 09XX XXXXXXX (11 digits total)
    const phPhoneRegex = /^09\d{9}$/;
    
    return phPhoneRegex.test(normalized);
}

/**
 * Formats phone number to standardized format: +639XXXXXXXXX (with country code)
 */
function formatPhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return null;
    
    let cleaned = phone.replace(/[\s\-]/g, '');
    
    // Normalize to 09 format
    let normalized = cleaned;
    if (cleaned.startsWith('+63')) {
        normalized = '0' + cleaned.slice(3);
    }
    
    if (validatePhoneNumber(normalized)) {
        // Format: +639XXXXXXXXX (country code format)
        // Remove leading 0 and add +63
        return `+63${normalized.slice(1)}`;
    }
    
    return null;
}

module.exports = { validatePhoneNumber, formatPhoneNumber };
