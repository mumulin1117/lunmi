require "base64"
require "openssl"

# Used by Fastlane only; this file is not part of the iOS project or IPA.
module LunmiSigningKey
  class InvalidKey < StandardError; end

  def self.load(content: nil, content_base64: nil, path: nil)
    raw_present = !utf8_text(content).strip.empty?
    encoded_present = !utf8_text(content_base64).strip.empty?
    if raw_present && encoded_present
      raise InvalidKey, "Set only one of ASC_KEY_CONTENT or ASC_KEY_CONTENT_BASE64 in CircleCI Environment Variables."
    end

    raw = if encoded_present
            begin
              Base64.strict_decode64(unwrap(content_base64).delete(" \t\r\n"))
            rescue ArgumentError
              raise InvalidKey, "ASC_KEY_CONTENT_BASE64 is not valid Base64. Encode the complete .p8 file, including its PEM header and footer."
            end
          elsif raw_present
            content
          elsif path && File.file?(path)
            File.binread(path)
          else
            raise InvalidKey, "App Store Connect private key is missing. Configure ASC_KEY_CONTENT or ASC_KEY_CONTENT_BASE64 in CircleCI; a local .p8 file is not available on the CI machine."
          end

    pem = unwrap(raw).gsub('\\r\\n', "\n").gsub('\\n', "\n").gsub('\\r', "\n").gsub(/\r\n?/, "\n").strip + "\n"
    unless pem.match?(/\A-----BEGIN (?:EC )?PRIVATE KEY-----\n/) && pem.match?(/\n-----END (?:EC )?PRIVATE KEY-----\n\z/)
      raise InvalidKey, "The App Store Connect key must contain the complete .p8 PEM private key. Paste only the value, not an ASC_KEY_CONTENT= assignment. For Base64 input use ASC_KEY_CONTENT_BASE64."
    end

    begin
      # An explicit empty password prevents an encrypted-key prompt in CI.
      key = OpenSSL::PKey.read(pem, "")
      unless key.is_a?(OpenSSL::PKey::EC) && key.private? && key.group.curve_name == "prime256v1" && key.check_key
        raise InvalidKey, "App Store Connect requires a valid EC P-256 private key from the downloaded .p8 file."
      end
    rescue OpenSSL::OpenSSLError, ArgumentError
      # Never include the underlying input or exception inspection in CI logs.
      raise InvalidKey, "The App Store Connect .p8 private key cannot be parsed as EC P-256. Check for missing lines, extra text or an incorrect Base64 setting."
    end
    pem
  end

  def self.utf8_text(input)
    value = input.to_s.dup.force_encoding(Encoding::UTF_8)
    raise InvalidKey, "The App Store Connect private key must be valid UTF-8 PEM text." unless value.valid_encoding?
    value
  end

  def self.unwrap(input)
    value = utf8_text(input).sub(/\A\uFEFF/, "").strip
    if value.length >= 2 && ((value.start_with?("'") && value.end_with?("'")) || (value.start_with?('"') && value.end_with?('"')))
      value = value[1...-1].strip
    end
    value.sub(/\A\uFEFF/, "").strip
  end
  private_class_method :unwrap, :utf8_text
end
