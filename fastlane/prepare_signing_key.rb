require_relative "signing_key"

# Local setup helper only; never included in the Xcode build or IPA.
module LunmiSigningKeyClipboard
  class ClipboardError < StandardError; end

  def self.copy_to_clipboard(encoded)
    IO.popen(["/usr/bin/pbcopy"], "w", err: File::NULL) do |clipboard|
      clipboard.write(encoded)
    end
    raise ClipboardError unless $?.success?
  end

  def self.run(arguments, output: $stdout, error_output: $stderr, clipboard_writer: method(:copy_to_clipboard))
    if arguments == ["--help"]
      output.puts("Usage: ruby fastlane/prepare_signing_key.rb /absolute/path/to/new-key.p8")
      return 0
    end
    unless arguments.length == 1 && !arguments.first.start_with?("-")
      error_output.puts("Provide exactly one downloaded .p8 file path. Use --help for usage.")
      return 1
    end

    path = File.expand_path(arguments.first)
    unless File.file?(path)
      error_output.puts("The selected .p8 file does not exist. Nothing was copied.")
      return 1
    end

    begin
      # Deliberately ignore environment variables and use only the selected file.
      pem = LunmiSigningKey.load(path: path)
      clipboard_writer.call(Base64.strict_encode64(pem))
    rescue LunmiSigningKey::InvalidKey => error
      error_output.puts("#{error.message} Nothing was copied.")
      return 1
    rescue ClipboardError, SystemCallError, IOError
      error_output.puts("Could not read the selected key or copy it to the macOS clipboard. No key contents are printed.")
      return 1
    end

    output.puts("EC P-256 format checked. The Base64 value is now on the macOS clipboard.")
    output.puts("In CircleCI Project Settings > Environment Variables:")
    output.puts("1. Remove ASC_KEY_CONTENT.")
    output.puts("2. Set ASC_KEY_CONTENT_BASE64 by pasting the clipboard value only (no assignment or quotes).")
    output.puts("3. Set ASC_KEY_ID and ASC_ISSUER_ID to the identifiers belonging to this key, then rerun the job.")
    output.puts("Local format validation does not check Apple authorization. No key contents were printed.")
    0
  end
end

exit LunmiSigningKeyClipboard.run(ARGV) if $PROGRAM_NAME == __FILE__
