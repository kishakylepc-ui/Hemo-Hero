    alignItems: 'center',
    backgroundColor: COLORS.card,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 12,
  },

  iconCircle: {
    width: 58,
    height: 58,
    marginBottom: 14,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },

  message: {
    marginTop: 7,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  detailsCard: {
    width: '100%',
    marginTop: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    backgroundColor: COLORS.white,
  },

  detailRow: {
    minHeight: 43,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },

  detailRowLast: {
    borderBottomWidth: 0,
  },

  detailLabel: {
    flex: 1,
    color: COLORS.lightMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 10.5,
    lineHeight: 15,
  },

  detailValue: {
    flex: 1.2,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'right',
  },

  actions: {
    width: '100%',
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
  },

  actionsSingle: {
    justifyContent: 'center',
  },

  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },

  cancelButtonText: {
    color: COLORS.muted,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },

  confirmButton: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmButtonText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});
